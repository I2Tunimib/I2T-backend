import fs from 'fs';
import { readFile } from 'fs/promises';
import csv from 'csv-parse';
import { parse } from 'JSONStream';
import stream from 'stream';
import TableUtilsService from '../tables/table-utils.service';
import yaml from 'js-yaml';
import ParseW3C from './parse-w3c.service';

const ParseService = {
  readYaml: async (path) => {
    const file = await readFile(path, 'utf-8');
    return yaml.load(file);
  },
  createJsonStreamReader: (path) => {
    const passThrough = new stream.PassThrough({
      objectMode: true
    });
    return fs.createReadStream(path, { encoding: 'utf8' })
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
  readJsonFile: async (path, acc = {}, pushFn) => {
    const stream = ParseService.createJsonStreamReader(path);
    const push = pushFn || ParseService.getPushFunction(acc);
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
  readCsvWithTransform: async (
    path,
    separator,
    parserOptions,
    transformFn,
    acc
  ) => {
    const stream = fs.createReadStream(path, { encoding: 'utf8' })
      .pipe(csv({ delimiter: separator, ...parserOptions }));
    let index = 0;
    for await (const row of stream) {
      acc = transformFn(acc, row, index);
      index++;
    }
    stream.end();
    return acc;
  },
  readJsonWithTransform: async (path, transformFn, acc) => {
    const stream = ParseService.createJsonStreamReader(path);
    let index = 0;
    for await (const row of stream) {
      acc = transformFn(acc, row, index);
      index++;
    }
    stream.end();
    return acc;
  },
  transformRow: (acc, row, index) => {
    const id = `r${index}`;
    const cells = Object.keys(row).reduce((acc, column) => {
      acc[column] = {
        id: `${id}$${column}`,
        label: row[column] || '',
        metadata: {
          reconciliator: {},
          values: []
        },
        editable: false,
        expandend: false
      }
      return acc;
    }, {});
    acc.byId[id] = { id, cells };
    acc.allIds.push(id);
    return acc;
  },
  transformHeader: (acc, header) => {
    return header.reduce((columns, column) => {
      columns.byId[column] = {
        id: column,
        label: column,
        status: 'empty',
        reconciliators: {},
        extension: ''
      }
      columns.allIds.push(column);
      return columns;
    }, acc);
  },
  parseRawCsv: async (path, separator) => {
    const columns = await ParseService.readCsvWithTransform(
      path,
      separator,
      { toLine: 1 },
      ParseService.transformHeader,
      { byId: {}, allIds: [] }
    );
    const rows = await ParseService.readCsvWithTransform(
      path,
      separator,
      { columns: true },
      ParseService.transformRow,
      { byId: {}, allIds: [] }
    );
    return { columns, rows };
  },
  parseRawJson: async (path) => {
    const rows = await ParseService.readJsonWithTransform(
      path,
      ParseService.transformRow,
      { byId: {}, allIds: [] }
    );
    const header = Object.keys(rows.byId[rows.allIds[0]].cells);
    const columns = ParseService.transformHeader({ byId: {}, allIds: [] }, header);
    return { columns, rows };
  },
  parse: async (filePath, options) => {
    const {
      tableType,
      tableFormat,
      separator
    } = options;

    if (tableType === 'raw') {
      if (tableFormat === 'csv') {
        return ParseService.parseRawCsv(filePath, separator);
      } else if (tableFormat === 'json') {
        return ParseService.parseRawJson(filePath);
      }
    } else if (tableType === 'annotated') {
      if (tableFormat === 'json') {
        return ParseW3C.parse(filePath);
      }
    }
  }
};

export default ParseService;
