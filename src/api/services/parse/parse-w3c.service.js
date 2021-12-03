import ParseService from './parse.service';
import { PassThrough } from 'stream';
import { parse } from 'JSONStream';
import { KG_INFO } from '../../../utils/constants';

const DEFAULT_HEADER_PROPERTIES = {
  label: '',
  status: 'empty',
  // extension: '',
  context: {},
  metadata: [],
  // expanded: false
}

const DEFAULT_CELL_PROPERTIES = {
  label: '',
  // editable: false,
  // expanded: false
}

const ParseW3C = {
  getContext: (context) => {
    return context.reduce((acc, item) => {
      const prefix = item.prefix.substring(0, item.prefix.length - 1);
      acc[prefix] = {
        prefix,
        ...item,
        total: 0,
        reconciliated: 0
      };
      return acc;
    }, {});
  },
  updateColumnsStatus: (columns, rows) => {
    Object.keys(columns).forEach((colId) => {
      const { context } = columns[colId];
      const totalReconciliated = Object.keys(context)
        .reduce((acc, key) => acc + context[key].reconciliated, 0);
      const hasMetadata = Object.keys(context).some((key) => context[key].total > 0);
      
      if (totalReconciliated === Object.keys(rows).length) {
        columns[colId].status = 'reconciliated';
      } else if (hasMetadata) {
        columns[colId].status = 'pending';
      }
    });
  },
  parseHeader: (header, reconciliators) => {
    return Object.keys(header).reduce((columns, key) => {
      const { 
        label,
        context = [],
        ...rest 
      } = header[key];
      columns[label] = {
        id: label,
        ...DEFAULT_HEADER_PROPERTIES,
        label,
        context: ParseW3C.getContext(context),
        ...rest
      };
      return columns;
    }, {});
  },
  prepareMetadata: (metadata) => {
    try {
      const a = metadata.map(({id, name, ...rest}) => {
        const [prefix, resourceId] = id.split(':');

        const kgUrl = KG_INFO[prefix] ? KG_INFO[prefix].uri : ''
  
        return {
          id,
          name: { value: name, uri: `${kgUrl}${resourceId}` },
          ...rest
        }
      })
      return a;
    } catch (err) {
      console.log(err);
    }
  },
  isCellReconciliated: (metadata) => metadata.some((item) => item.match),
  updateReconciliatorsCount: (metadata, column, columns) => {
    if (metadata.length > 0) {
      const [prefix, _] = metadata[0].id.split(':');
      const { total, reconciliated } = columns[column].context[prefix];
      
      columns[column].context[prefix] = {
        ...columns[column].context[prefix],
        total: total + 1,
        reconciliated: ParseW3C.isCellReconciliated(metadata) ? reconciliated + 1 : reconciliated
      }
    }
  },
  addRow: (rows, parsedRow) => {
    rows[parsedRow.id] = parsedRow;
  },
  parseRow: (row, index, columns, reconciliators) => {
    const id = `r${index}`;
    let nReconciliated = 0;
    const cells = Object.keys(row).reduce((acc, column) => {
      const { metadata: metaRaw = [], ...rest } = row[column]
      const metadata = ParseW3C.prepareMetadata(metaRaw);
      ParseW3C.updateReconciliatorsCount(metadata, column, columns);
      acc[column] = {
        id: `${id}$${column}`,
        ...DEFAULT_CELL_PROPERTIES,
        ...rest,
        metadata
      }
      if (metadata.some((item) => item.match)) {
        nReconciliated += 1;
      }
      return acc;
    }, {});
    return { id, cells, nReconciliated }
  },
  parse: async (entry) => {
    const { reconciliators } = await ParseService.readYaml('./config.yml');
    // const stream = ParseService.createJsonStreamReader(filePath);
    const passThrough = new PassThrough({
      objectMode: true
    });
    // const stream = ParseService.createJsonStreamReader(path);
    const stream = entry.pipe(parse('*')).pipe(passThrough);

    let columns = {};
    let rows = {};
    let nCells = 0;
    let nCellsReconciliated = 0;
    
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
      const { nReconciliated, ...rest } = ParseW3C.parseRow(row, rowIndex, columns, reconciliators);
      ParseW3C.addRow(rows, rest);
      nCellsReconciliated += nReconciliated;
      rowIndex += 1;
    }
    // update columns reconciliated status
    ParseW3C.updateColumnsStatus(columns, rows);
    nCells = Object.keys(rows).length * Object.keys(columns).length 
    return { columns, rows, nCells, nCellsReconciliated };
  }
};

export default ParseW3C;
