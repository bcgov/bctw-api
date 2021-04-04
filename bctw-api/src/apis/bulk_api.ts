import { Request, Response } from 'express';
import * as xml2js from 'xml2js';
import { readFile } from 'fs';
import { promisify } from 'util';
import { constructFunctionQuery, getRowResults, query } from '../database/query';
import { QResult } from '../types/query';
import { IBulkResponse } from '../types/import_types';
import { Collar } from '../types/collar';
const readPromise = promisify(readFile);

const VECT_KEY_UPSERT_FN = `upsert_vectronic_key`;

// interface representing an api_vectronics_collar_data table row
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
 * creates an object representing an api_vectronics_collar_data table row
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
    this.collartype = collar.collarType[0];
  }
}

// new collar device from a keyx file
class VectronicDevice implements Pick<Collar, 'device_id' | 'device_deployment_status' | 'device_make' | 'satellite_network'> {
  device_id: number;
  device_deployment_status: string;
  device_make: string;
  satellite_network: string;

  constructor(keyx: IKeyX) {
    this.device_id = +keyx.idcollar;
    // todo: retrieve code values for these
    this.satellite_network = '';
    this.device_deployment_status = '';
    this.device_make = '';
  }
}

const parseXML = async (req: Request, res: Response): Promise<Response<IBulkResponse>> => {
  const files = req.files;
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const promises: Promise<QResult>[]= [];

  if (!files && (files as Express.Multer.File[]).length) {
    bulkResp.errors.push({row: '', error: 'no attached found', rownum: -1});
    return res.send(bulkResp);
  }
  // iterate keyx files, creating a promise for each file
  for (let idx = 0; idx < files.length; idx++) {
    const file = await readPromise(files[idx].path);
    const asJson = await new xml2js.Parser().parseStringPromise(file);
    const k = new VectronicKeyxRow(asJson as IKeyXAsJson);
    const sql = constructFunctionQuery(VECT_KEY_UPSERT_FN, [k.idcollar, k.comtype, k.idcom, k.collarkey, k.collartype], false);
    promises.push(query(sql, '', true))
  }
  const resolved = await Promise.all(promises);
  const errors = resolved.filter(r => r.isError).map(e => e.error);
  const results = resolved.filter(r => !r.isError).map(e => getRowResults(e.result, VECT_KEY_UPSERT_FN)[0]) as IKeyX[];
  const ret = {errors, results };

  // create collars for each successful keyx database insertion
  const collars = results.map(r => new VectronicDevice(r))
  console.log(JSON.stringify(collars))
  return res.send(ret);
};

export { parseXML };
