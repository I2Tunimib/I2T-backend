import fs from 'fs';
import { readFile } from 'fs/promises';
import csv from 'csv-parse';
import { parse } from 'JSONStream';
import stream from 'stream';
import TableUtilsService from '../tables/table-utils.service';
import yaml from 'js-yaml';
import ParseW3C from './parse-w3c.service';

const DEFAULT_HEADER_PROPERTIES = {
  label: '',
  status: 'empty',
  extension: '',
  context: {},
  metadata: [],
}

const DEFAULT_CELL_PROPERTIES = {
  label: '',
  metadata: []
}

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
        ...DEFAULT_CELL_PROPERTIES,
        label: row[column] || '',
      }
      return acc;
    }, {});
    acc[id] = { id, cells };
    return acc;
  },
  transformHeader: (acc, header) => {
    return header.reduce((columns, column) => {
      columns[column] = {
        id: column,
        ...DEFAULT_HEADER_PROPERTIES,
        label: column
      }
      return columns;
    }, acc);
  },
  parseRawCsv: async (path, separator) => {
    const columns = await ParseService.readCsvWithTransform(
      path,
      separator,
      { toLine: 1 },
      ParseService.transformHeader,
      {}
    );
    const rows = await ParseService.readCsvWithTransform(
      path,
      separator,
      { columns: true },
      ParseService.transformRow,
      {}
    );
    return { columns, rows };
  },
  parseRawJson: async (path) => {
    const rows = await ParseService.readJsonWithTransform(
      path,
      ParseService.transformRow,
      {}
    );
    const header = Object.keys(rows[Object.keys(rows)[0]].cells);
    const columns = ParseService.transformHeader({}, header);
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
