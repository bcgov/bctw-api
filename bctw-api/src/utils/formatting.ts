export const formatNullableSqlValue = (value: string | Date | null | undefined): string => {
    return value ? `'${value}'` : `NULL`;
}

export const formatJsArrayToPgArray = (value: string[]): string => {
    return `ARRAY[${value.map(a => `'${a}'`).join(', ')}]`;
}

export const collectQueryParamArray = (value: any): string[] => {
    const retArr: string[] = [];
    if(typeof value === 'string') {
        retArr.push(String(value));
    }
      else {
        retArr.push(...(value as string[]));
    }
    return retArr;
}