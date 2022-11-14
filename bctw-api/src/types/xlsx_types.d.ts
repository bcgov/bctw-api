import { DataValidation } from "exceljs";

declare module 'exceljs' {
    export interface DataValidations {
        add(range: string, validation: DataValidation): void;
        readonly model: Record<string, DataValidation>;
    }
    
    export interface Worksheet {
        dataValidations: DataValidations;
    }
}