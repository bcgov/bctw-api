export const formatNullableSqlValue = (value: string | Date | null | undefined): string => {
    return value ? `'${value}'` : `NULL`;
}

export const formatJsArrayToPgArray = (value: string[]): string => {
    return `ARRAY[${value.map(a => `'${a}'`).join(', ')}]`;
}

export const collectQueryParamArray = (value: unknown): string[] => {
    const retArr: string[] = [];
    if(typeof value === 'string') {
        retArr.push(...(String(value).split(',')));
    }
    else if (Array.isArray(retArr)) {
        retArr.push(...(value as string[]));
    }
    else {
        throw new Error('Unable to parse query search params.');
    }
    return retArr;
}