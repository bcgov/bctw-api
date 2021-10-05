import { QueryResult } from "pg";

export type QResult = {
  result: QueryResult;
  error: Error;
  isError: boolean;
};

interface IFilter {
  id?: string;
  ids?: string[];
}

interface IConstructQueryParameters {
  base: string,
  filter?: string,
  order?: string,
  group?: string[],
  page?: number,
}

enum TelemetryType {
  animal = 'animal',
  collar = 'collar',
  user = 'user'
}

// define a callback function type for queries
type QueryResultCbFn = (err: Error, result?: QueryResult) => void

export {
  IConstructQueryParameters,
  IFilter,
  QueryResultCbFn,
  TelemetryType,
}