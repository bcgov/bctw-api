import { Request, Response } from 'express';
import * as xml2js from 'xml2js';
import { readFile } from 'fs';
import { promisify } from 'util';
import { constructFunctionQuery, getRowResults, query } from '../database/query';
import { QResult } from '../types/query';
import { IBulkResponse } from '../types/import_types';
import { Collar } from '../types/collar';
import { S_BCTW } from '../constants';
import { getUserIdentifier, MISSING_USERNAME } from '../database/requests';
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
    this.satellite_network = keyx.comtype;
    this.device_deployment_status = 'Not Deployed';
    this.device_make = 'Vectronic';
  }
}

const getCodeValueSQL = (header: string, description: string): string => 
  `${S_BCTW}.get_code_value('${header}', '${description}')`;

const createDeviceSQL = (keyx: IKeyX[], idir: string): string => {
  const newDevices = keyx.map(k => new VectronicDevice(k));
  return `insert into ${S_BCTW}.collar
  (device_id, satellite_network, device_deployment_status, device_make, created_by_user_id)
  values ${newDevices.map(nd => {
    return `(${nd.device_id}, ${getCodeValueSQL('satellite_network', nd.satellite_network)}, ${getCodeValueSQL('device_deployment_status', nd.device_deployment_status)}, ${getCodeValueSQL('device_make', nd.device_make)}, ${S_BCTW}.get_user_id('${idir}'))`
  })} returning *`;
}

/**
 * exposed as an API for handling the bulk import of Vectronic .keyx registration collars
 * parses the .keyx files and inserts results to the bctw.api_vectronics_collar_data table
 * to allow the data-collector module to retrieve telemetry records for the device
 */
const parseVectronicKeyRegistrationXML = async (req: Request, res: Response): Promise<Response<IBulkResponse>> => {
  const id = getUserIdentifier(req);
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  if (!id) {
    bulkResp.errors.push({ row: '', error: MISSING_USERNAME, rownum: 0 });
    return res.send(bulkResp);
  }
  const files = req.files as Express.Multer.File[];
  const promises: Promise<QResult>[]= [];

  if (!files || !files.length) {
    bulkResp.errors.push({row: '', error: 'no attached files found', rownum: -1});
    return res.send(bulkResp);
  }
  // iterate keyx files, creating a promise for each file
  try {
    for (let idx = 0; idx < files.length; idx++) {
      const file = await readPromise(files[idx].path, {encoding: 'utf-8'});
      console.log('parseVectronicKeyRegistrationXML xml file read:', file);
      const asJson = await new xml2js.Parser().parseStringPromise(file);
      const k = new VectronicKeyxRow(asJson as IKeyXAsJson);
      const sql = constructFunctionQuery(VECT_KEY_UPSERT_FN, [k.idcollar, k.comtype, k.idcom, k.collarkey, k.collartype], false);
      promises.push(query(sql, '', true))
    }
  }
  catch (err) {
    bulkResp.errors.push({row: '', error:`parseVectronicKeyRegistrationXML: error parsing xml: ${err}`, rownum: 0});
    return res.send(bulkResp);
  }
  const resolved = await Promise.all(promises);
  const errors = resolved.filter(r => r.isError).map(e => e.error);
  // if there were errors registering the collars, return early
  if (errors.length) {
    const errs = errors.map(e => {
      return {row: '', error: e.message, rownum: 0};
    })
    bulkResp.errors.push(...errs);
    return res.send(bulkResp);
  }
  const results = resolved.filter(r => !r.isError).map(e => getRowResults(e.result, VECT_KEY_UPSERT_FN)[0]) as IKeyX[];
  bulkResp.results.push(...results);
  // note: disabling this as the collar will be created on metadata csv imports anyway?
  // if registration was successful, generate sql to create new collar devices
  // const newCollarSQL = createDeviceSQL(results, id);
  // const ret = await query(newCollarSQL, '', false);
  // if (ret.isError) {
  //   bulkResp.errors.push({row: '', error: ret.error.message, rownum: -1});
  // }
  // bulkResp.results.push(...ret.result.rows);
  return res.send(bulkResp);
};

export { parseVectronicKeyRegistrationXML };
