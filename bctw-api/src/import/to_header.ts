const mapCsvImport = (header: string): string => {
  switch (header) {
    // critters
    case 'Caribou Ecotype':
      return 'ecotype';
    case 'Caribou Population Unit':
      return 'population_unit';
    case 'Re-capture':
      return 're_capture';
    case 'Translocation':
    case 'Trans-location':
      return 'trans_location';
    // collars
    case 'Make':
      return 'collar_make';
    case 'Model':
      return 'collar_model';
    case 'Reg-Key':
      return 'reg_key';
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
      return headerToColumn(header);
  }
}

const headerToColumn = (header: string): string => {
  return header.split(' ').map(p => p.toLowerCase()).join('_');
}

export {
  mapCsvImport,
}