import fs from 'fs';
import csv from 'csv-parse';
import { parse } from 'JSONStream';
import stream from 'stream';
import TableUtilsService from '../tables/table-utils.service';

const ParseService = {
  createJsonStreamReader: (path) => {
    const passThrough = new stream.PassThrough({
      objectMode: true
    });
    return fs.createReadStream(path, { encoding: 'utf8'})
      .pipe(parse('*'))
      .pipe(passThrough);
  },
  getPushFunction: (acc) => {
    if (Array.isArray(acc)) {
      return (item) => {
        acc.push(item);
      }
    }
    return (item) => {
      acc[item.id] = item;
    }
  },
  readJsonFile: async (path, acc = {}) => {
    const stream = ParseService.createJsonStreamReader(path);
    const push = ParseService.getPushFunction(acc);
    for await (const obj of stream) {
      push(obj);
    }
    stream.end();
    return acc;
  },
  readJsonFileWithCondition: async (path, condition, acc = []) => {
    const stream = ParseService.createJsonStreamReader(path);
    const push = ParseService.getPushFunction(acc);
    for await (const obj of stream) {
      if (condition(obj)) {
        push(obj)
      }
    }
    stream.end();
    return acc;
  },
  readOneRecord: async (path, condition) => {
    const stream = ParseService.createJsonStreamReader(path);
    for await (const obj of stream) {
      if (condition(obj)) {
        stream.destroy();
        return obj;
      }
    }
  },
  parseRows: async (stream) => {
    const rows = { byId: {}, allIds: [] }
    let index = 0;
    for await (const row of stream) {
      const id = `r${index}`;
      const cells = Object.keys(row).reduce((acc, column) => {
        acc[column] = {
          label: row[column] || '',
          metadata: {
            reconciliator: '',
            values: []
          },
          editable: false,
          expandend: false
        }
        return acc;
      }, {});
      rows.byId[id] = { id, cells };
      rows.allIds.push(id);
      index++;
    }
    return rows;
  },
  parseColumns: async (rows) => {
    const columns = Object.keys(rows.byId[rows.allIds[0]].cells).reduce((acc, column) => {
      acc.byId[column] = {
        id: column,
        label: column,
        status: 'empty',
        reconciliators: [],
        extension: ''
      }
      acc.allIds.push(column);
      return acc;
    }, { byId: {}, allIds: [] });
    return columns;
  },
  parseCsv: async (table) => {
    const stream = fs.createReadStream(TableUtilsService.getTablePath(table), { encoding: 'utf8'})
      .pipe(csv({ columns: true, delimiter: table.separator }));
    const rows = await ParseService.parseRows(stream);
    const columns = await ParseService.parseColumns(rows);
    return { columns, rows };
  },
  parseJson: async (table) => {
    const stream = ParseService.createJsonStreamReader(TableUtilsService.getTablePath(table));
    const rows = await ParseService.parseRows(stream);
    const columns = await ParseService.parseColumns(rows);
    return { columns, rows };
  },
  parse: async (table) => {
    if (table.type === 'raw'){
      if (table.format === 'csv') {
        return ParseService.parseCsv(table);
      } else if (table.format === 'json') {
        return ParseService.parseJson(table);
      }
    } else if (table.type === 'annotated') {
      return JSON.parse(await TableUtilsService.getTableFile(table.id));
    }
  }
};

export default ParseService;
