const mapCsvImport = (header: string): string => {
  switch (header) {
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
    default:
      return header;
  }
}

const headerToColumn = (header: string): string => {
  return header.split(' ').map(p => p.toLowerCase()).join('_');
}

export {
  mapCsvImport,
}