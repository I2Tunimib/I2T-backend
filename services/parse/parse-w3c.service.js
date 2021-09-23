import ParseService from './parse.service';

const ParseW3C = {
  initReconciliatorsMap: (column, reconciliators) => {
    return reconciliators.reduce((acc, recon) => {
      acc[recon.id] = {
        total: 0,
        reconciliated: 0
      };
      return acc;
    }, {});
  },
  updateColumnsStatus: (columns, rows) => {
    columns.allIds.forEach((colId) => {
      const { reconciliators } = columns.byId[colId];
      const totalReconciliated = Object.keys(reconciliators)
        .reduce((acc, key) => acc + reconciliators[key].reconciliated, 0);
      const hasMetadata = Object.keys(reconciliators).some((key) => reconciliators[key].total > 0);
      
      if (totalReconciliated === rows.allIds.length) {
        columns.byId[colId].status = 'reconciliated';
      } else if (hasMetadata) {
        columns.byId[colId].status = 'pending';
      }
    });
  },
  parseHeader: (header, reconciliators) => {
    return Object.keys(header).reduce((columns, key) => {
      const { label } = header[key];
      columns.byId[label] = {
        id: label,
        label: label,
        status: 'empty',
        reconciliators: ParseW3C.initReconciliatorsMap(label, reconciliators),
        extension: ''
      };
      columns.allIds.push(label);
      return columns;
    }, { byId: {}, allIds: [] });
  },
  prepareMetadata: (metadata, reconciliators) => {
    if (metadata.length === 0) {
      return {
        reconciliator: '',
        values: []
      }
    }
    const [prefix, id] = metadata[0].id.split(':');
    const reconciliator = reconciliators.find((reconciliator) => prefix === reconciliator.prefix);
    const values = metadata.map((meta) => ({
      ...meta,
      id
    }));
    return {
      reconciliator: reconciliator ? {
        id: reconciliator.id
      } : '',
      values
    }
  },
  isCellReconciliated: (metadata) => metadata.some((item) => item.match),
  updateReconciliatorsCount: ({ reconciliator, values }, column, columns) => {
    if (reconciliator && reconciliator.id) {
      const { total, reconciliated } = columns.byId[column].reconciliators[reconciliator.id];

      columns.byId[column].reconciliators[reconciliator.id] = {
        total: total + 1,
        reconciliated: ParseW3C.isCellReconciliated(values) ? reconciliated + 1 : reconciliated
      }
    }
  },
  addRow: (rows, parsedRow) => {
    rows.byId[parsedRow.id] = parsedRow;
    rows.allIds.push(parsedRow.id);
  },
  parseRow: (row, index, columns, reconciliators) => {
    const id = `r${index}`;
    const cells = Object.keys(row).reduce((acc, column) => {
      const { label, metadata: metadataRaw } = row[column];
      const metadata = ParseW3C.prepareMetadata(metadataRaw, reconciliators);
      ParseW3C.updateReconciliatorsCount(metadata, column, columns);
      acc[column] = {
        id: `${id}$${column}`,
        label: label || '',
        metadata,
        editable: false,
        expandend: false
      }
      return acc;
    }, {});
    return { id, cells }
  },
  parse: async (filePath) => {
    const { reconciliators } = await ParseService.readYaml('./config.yml');
    const stream = ParseService.createJsonStreamReader(filePath);

    let columns = { byId: {}, allIds: [] };
    let rows = { byId: {}, allIds: [] };
    
    let rowIndex = -1;
    for await (const row of stream) {
      if (rowIndex === -1) {
        // to parse header and transform to initial state.
        // we need to add information after rows are parsed.
        columns = ParseW3C.parseHeader(row, reconciliators);
        // pass to next iteration
        rowIndex += 1;
        continue;
      }
      // parse row and update reconciliators count
      ParseW3C.addRow(rows, ParseW3C.parseRow(row, rowIndex, columns, reconciliators));
      rowIndex += 1;
    }
    // update columns reconciliated status
    ParseW3C.updateColumnsStatus(columns, rows);
    return { columns, rows };
  }
};

export default ParseW3C;
