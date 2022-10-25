import { QueryResult } from 'pg';

export type QResult = {
  result: QueryResult;
  error: Error;
  isError: boolean;
};

type SearchFilter = {
  keys: string[];
  term: string[];
};

export type Order = {
  field: string;
  order?: 'desc' | 'asc';
};

interface IConstructQueryParameters {
  base: string;
  filter?: string;
  order?: Order[];
  group?: string[];
  page?: number;
}

enum TelemetryType {
  animal = 'animal',
  collar = 'collar',
  user = 'user',
}

// define a callback function type for queries
type QueryResultCbFn = (err: Error, result?: QueryResult) => void;

export {
  IConstructQueryParameters,
  QueryResultCbFn,
  TelemetryType,
  SearchFilter,
};
