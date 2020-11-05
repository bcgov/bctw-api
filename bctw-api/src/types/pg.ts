
import { Request } from "express"
import { QueryResult } from "pg";

// interface ISearch {
//   column?: string,
//   value: string
// }

interface IFilter {
  id?: string;
  ids?: string[];
  // search?: ISearch 
}

interface IConstructQueryParameters {
  base: string,
  filter?: string,
  order?: string,
  group?: string,
  page?: string,
}

enum TelemetryTypes {
  animal = 'animal',
  collar = 'collar',
  user = 'user'
}

// define a callback function type for queries
type QueryResultCbFn = (err: Error, result?: QueryResult) => void

// parses the request parameters or request query parameters to
// create an IFilter
const filterFromRequestParams = (req: Request): IFilter => {
  let keys: string[] = Object.keys(req.params);
  if (!keys.length) {
    keys = Object.keys(req.query);
  } 
  // if (keys.includes('id') || keys.includes('search')) {
  if (keys.includes('id')) {
    return {
      id: req.params.id ?? req.query.id,
      // search: <ISearch><unknown>req.params.search
    }
  } else if (keys.includes('ids')) {
    return {
      ids: <string[]><unknown>req.params.ids
    }
  }
  return {};
}

export {
  filterFromRequestParams,
  IConstructQueryParameters,
  IFilter,
  // ISort,
  QueryResultCbFn,
  TelemetryTypes
}