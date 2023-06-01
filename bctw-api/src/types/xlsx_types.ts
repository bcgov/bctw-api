import { DataValidation, Worksheet } from 'exceljs';

interface DataValidations {
  add(range: string, validation: DataValidation): void;
  readonly model: Record<string, DataValidation>;
}

export type ExtendedWorksheet = Worksheet & {
  dataValidations: DataValidations;
};
