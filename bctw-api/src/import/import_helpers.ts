/**
 * converts csv headers to the database column names
 * @param header the first line in the csv file contains the headers
 */
const mapCsvHeader = (header: string): string => {
  const trimmed = header.trim();
  switch (trimmed) {
    // codes & code headers
    // header is aliased to type in the UI for a more user friendly name
    case 'Code Type':
      return 'code_header';
    case 'Code Type Name':
      return 'code_header_name';
    case 'Code Type Title':
      return 'code_header_title';
    case 'Code Type Description':
      return 'code_header_description';
    case 'Code Name':
    case 'Code Description':
    case 'Code Description Long':
    case 'Valid From':
    case 'Valid To':
      return headerToColumn(trimmed);
    default:
      return trimmed;
  }
}

const headerToColumn = (header: string): string => {
  return header.split(' ').map(p => p.toLowerCase()).join('_');
}

export {
  mapCsvHeader,
}