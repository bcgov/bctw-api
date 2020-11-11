import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { QueryResult } from 'pg';
import { _addAnimal } from '../apis/animal_api';
import { _addCode, _addCodeHeader } from '../apis/code_api';
import { _assignCollarToCritter } from '../apis/collar_api';
import { getRowResults, momentNow } from '../pg';
import { Animal } from '../types/animal';
import { ICodeInput, ICodeHeaderInput, isCode, isCodeHeader, ICodeHeaderRow, ICodeRow, ParsedRows, IAnimalRow, isAnimal } from '../types/code';
import { mapCsvImportAnimal } from './to_header';

const _removeUploadedFile = async (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log(`unabled to remove uploaded csv: ${err}`)
    } else console.log(`uploaded csv file removed: ${path}`)
  });
}

const _parseCsv = async (
    file: Express.Multer.File,
    callback:(rowObj: ParsedRows) => void 
  ) => {
    const codes: ICodeRow = {rows: []};
    const headers: ICodeHeaderRow = {rows: []};
    const animals: IAnimalRow = {rows: []};
    const ret: ParsedRows = {codes: codes.rows, headers: headers.rows, animals: animals.rows};

    fs.createReadStream(file.path).pipe(csv({
      mapHeaders: ({ header }) => {
        return mapCsvImportAnimal(header)
      }
    }))
    .on('data', (row: ICodeInput | ICodeHeaderInput) => {
      if (isCodeHeader(row)) headers.rows.push(row)
      else if (isCode(row)) codes.rows.push(row);
      else if (isAnimal(row)) animals.rows.push(row);
    })
    .on('end', async () => {
      console.log(`CSV file ${file.path} processed\n  codes: ${codes.rows.length}\n  headers: ${headers.rows.length}`);
      await callback(ret);
    });
}

const _handleCollarLink = async (idir: string, rows: Animal[], resultRows: Animal[]) => {
  const animalsWithCollars = rows.filter((a) => a.device_id);
  animalsWithCollars.forEach(async (a: Animal) => {
    const aid = resultRows.find((row: Animal) => row.animal_id === a.animal_id)?.id;
    if (!aid) {
      return;
    }
    await _assignCollarToCritter(idir, +a.device_id, aid, momentNow(), null, (err, data) => {
      if (err) {
        console.log(`unable to link collar to critter ${aid} from bulk critter upload: ${err}`);
      } else {
        console.log(`linked collar ${a.device_id} to critter ${aid} from bulk critter upload`);
      }
    });
  });
}

const importCsv = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir){
    res.status(500).send('must supply idir');
  } 
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  let headerResults;
  let codeResults;
  let animalResults;

  const onFinishedParsing = async (rows: ParsedRows) => {
    let results;
    const codes = rows.codes;
    const headers = rows.headers;
    const animals = rows.animals;
    try {
      if (codes.length) {
        codeResults = await _addCode(idir, codes[0].code_header, codes);
      } else if (headers.length) {
        headerResults = await _addCodeHeader(idir, headers);
      } else if (animals.length) {
        animalResults = await _addAnimal(idir, animals);
        await _addAnimal(idir, animals).then(r => {
          results = getRowResults(r, 'add_animal');
        });
        if (results.length) {
          try {
            _handleCollarLink(idir, animals, results[0]);
          } catch (e2) {
            res.status(500).send(`unable to link bulk upload critter to device: ${e2.message}`);
          }
        }
      }
      _removeUploadedFile(file.path);
    } catch (e) {
      res.status(500).send(e.message);
    }
    try {
      if ((headerResults as QueryResult[])?.length || (headerResults as QueryResult)?.rows.length) {
        res.send(getRowResults(headerResults, 'add_code_header'));
      } else if ((codeResults as QueryResult[])?.length || (codeResults as QueryResult)?.rows.length) {
        res.send(getRowResults(codeResults, 'add_code'))
      } else if ((animalResults as QueryResult[])?.length || (animalResults as QueryResult)?.rows.length) {
        res.send(getRowResults(animalResults, 'add_animal'))
      }
    } catch(e) {
      console.log(`error parsing add_code or add_code_header results: ${e}`)
      res.status(500).send(`csv rows were uploaded but there was an error while parsing results from db api`);
    }
  }
  await _parseCsv(file, onFinishedParsing);
}

export {
  importCsv
}
