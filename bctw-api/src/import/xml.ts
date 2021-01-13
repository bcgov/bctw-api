/*
  not in use
*/
import { promises as fs } from 'fs';
import * as parser from 'xml2json';

const parseXML = async (path: string): Promise<any> => {
  try {
    const data = await fs.readFile(path);
    if (data) {
      const json = parser.toJson(data, { object: true });
      return json;
    }
  } catch (e) {
    console.log(`error reading or parsing xml file: ${e}`);
  }
};

const parseKeyx = async (json): Promise<VectronicsKeyCollar> => {
  const keyobj: VectronicsKeyCollar = json?.collarKey?.collar;
  if (!keyobj) {
    console.log('unable to parse xml file');
    return { id: '', comIDList: null, key: '', collarType: '' };
  }
  console.log(JSON.stringify(keyobj));
  return keyobj;
};

const testxml = async (): Promise<VectronicsKeyCollar> => {
  const parsed = await parseXML(process.env.KEYXSAMPLE || '');
  return parseKeyx(parsed);
};

type VectronicsKeyCollar = {
  id: string;
  comIDList: any;
  key: string;
  collarType: string;
};

export {};
