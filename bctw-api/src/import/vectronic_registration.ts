import { Request, Response } from 'express';
import * as xml2js from 'xml2js';
import { readFile } from 'fs';
import { promisify } from 'util';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { QResult } from '../types/query';
import { IBulkResponse } from '../types/import_types';
import { getUserIdentifier } from '../database/requests';
import AdmZip from 'adm-zip';
const readPromise = promisify(readFile);

const VECT_KEY_UPSERT_FN = `upsert_vectronic_key`;

// interface representing an api_vectronic_credential table row
interface IKeyX {
  idcollar: string;
  collarkey: string;
  comtype: string;
  idcom: string;
  collartype: number;
}

// interface representing the raw keyx file
interface IKeyXAsJson {
  collarKey: {
    collar: {
      $: { ID: string };
      comIDList: {
        comID: {
          _: string;
          $: { comType: string };
        };
      }[];
      key: string[];
      collarType: number[];
    }[];
  };
}

/**
 * class that takes @param {IKeyXAsJson} as a constructor parameter
 * creates an object representing an api_vectronic_credential table row
 */
class VectronicKeyxRow implements IKeyX {
  idcollar: string;
  comtype: string;
  idcom: string;
  collarkey: string;
  collartype: number;

  constructor(keyx: IKeyXAsJson) {
    const collar = keyx.collarKey.collar[0];
    this.idcollar = collar.$.ID;
    this.collarkey = collar.key[0];
    this.idcom = collar.comIDList[0].comID[0]._;
    this.comtype = collar.comIDList[0].comID[0].$.comType;
    this.collartype = collar?.collarType ? collar.collarType[0] : 0;
  }
}

const retrieveCollarKeyXRelation = async (
  req: Request,
  res: Response
): Promise<unknown> => {
  const userid = getUserIdentifier(req);
  let param: string | string[] | undefined = `'${userid}'`;
  const { device_ids } = req.query;
  if (device_ids) {
    const pgDeviceFormatted = `'{${device_ids}}'::integer[]`;
    param = pgDeviceFormatted;
  }
  const sql = `select * from bctw.get_collars_and_keyx(${param})`;
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve keyX details'
  );
  if (isError) {
    res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * exposed as an API for handling the bulk import of Vectronic .keyx registration collars
 * parses the .keyx files and inserts results to the bctw.api_vectronic_credential table
 * to allow the data-collector module to retrieve telemetry records for the device
 * note: the collar record is no longer created as this workflow assumes collar metadata
 * will be uploaded at a later point.
 */
const parseVectronicKeyRegistrationXML = async (
  req: Request,
  res: Response
): Promise<Response<IBulkResponse>> => {
  const ZIP = 'application/x-zip-compressed';
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const files = req.files as Express.Multer.File[];
  const promises: Promise<QResult>[] = [];
  const buffers: string[] = [];

  if (!files || !files.length) {
    bulkResp.errors.push({
      row: '',
      error: 'no keyX files imported',
      rownum: -1,
    });
    return res.send(bulkResp);
  }

  // sift through keyX imports and unzip all zipped entries
  for (const file of files) {
    if (file.mimetype === ZIP) {
      const zip = new AdmZip(file.path);
      const zipEntries = zip.getEntries();
      zipEntries.forEach((z) => {
        buffers.push(z.getData().toString('utf8'));
      });
    } else {
      const regFile = await readPromise(file.path, { encoding: 'utf-8' });
      buffers.push(regFile);
    }
  }

  // iterate keyx files, creating a promise for each file
  try {
    for (let idx = 0; idx < buffers.length; idx++) {
      const buffer = buffers[idx];
      const asJson: IKeyXAsJson = await new xml2js.Parser().parseStringPromise(
        buffer
      );

      const { idcollar, comtype, idcom, collarkey, collartype } =
        new VectronicKeyxRow(asJson);

      const sql = constructFunctionQuery(
        VECT_KEY_UPSERT_FN,
        [idcollar, comtype, idcom, collarkey, collartype],
        false
      );
      promises.push(query(sql, '', true));
    }
  } catch (err) {
    bulkResp.errors.push({
      row: '',
      error: `parseVectronicKeyRegistrationXML: error parsing xml: ${err}`,
      rownum: 0,
    });
    return res.send(bulkResp);
  }
  const resolved = await Promise.all(promises);
  const errors = resolved.filter((r) => r.isError).map((e) => e.error);
  if (errors.length) {
    bulkResp.errors.push(
      ...errors.map((e) => ({ row: '', error: e.message, rownum: 0 }))
    );
  }
  const results = resolved
    .filter((r) => !r.isError)
    .map((e) => getRowResults(e.result, VECT_KEY_UPSERT_FN, true)) as IKeyX[];
  bulkResp.results.push(...results);
  return res.send(bulkResp);
};

export { parseVectronicKeyRegistrationXML, retrieveCollarKeyXRelation };
