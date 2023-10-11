import fs from 'fs';
import { readFile } from 'fs/promises';
import csv from 'csv-parse';
import { parse } from 'JSONStream';
import { PassThrough } from 'stream';
import yaml from 'js-yaml';
import ParseW3C from './parse-w3c.service';
import { cloneStream } from '../../../utils/cloneStream';

const DEFAULT_HEADER_PROPERTIES = {
  label: '',
  status: 'empty',
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
  createJsonStreamReader: (path, pattern = '*') => {
    const passThrough = new PassThrough({
      objectMode: true
    });
    return fs.createReadStream(path, { encoding: 'utf8' })
      .pipe(parse(pattern))
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
  readJsonFile: async ({
    path,
    pattern,
    condition,
    transformFn,
    stopAtFirst = false,
    acc = []
  }) => {
    const stream = ParseService.createJsonStreamReader(path, pattern);
    const push = ParseService.getPushFunction(acc);
    for await (const obj of stream) {
      if (condition) {
        if (await condition(obj)) {
          if (stopAtFirst) {
            acc = transformFn ? transformFn(obj) : obj;
            break;
          }
          push(transformFn ? transformFn(obj) : obj)
        }
      } else {
        push(transformFn ? transformFn(obj) : obj)
      }
    }
    stream.end();
    return acc;
  },
  findOneInJson: async ({
    path,
    pattern,
    condition,
    transformFn
  }) => {
    let value = undefined;
    const stream = ParseService.createJsonStreamReader(path, pattern);
    for await (const obj of stream) {
      if (condition(obj)) {
        value = transformFn ? transformFn(obj) : obj;
        break;
      }
    }
    stream.end();
    return value;
  },
  unzip: async ({
    filePath,
    destination,
    transformFn
  }) => {
    const zip = createReadStream(filePath).pipe(unzipper.Parse({ forceStream: true }))
    let nFiles = 0;

    for await (const entry of zip) {
      const { path, type } = entry.path;

      if (type === 'File') {
        entry.pipe(fs.createWriteStream(destination(path, nFiles)));
        nFiles += 1;
      } else {
        entry.autodrain();
      }
    }
    return nFiles;
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
    entry,
    parserOptions,
    transformFn,
    acc
  ) => {
    const stream = entry.clone().pipe(csv({ ...parserOptions }));
    let index = 0;
    for await (const row of stream) {
      acc = transformFn(acc, row, index);
      index++;
    }
    stream.end();
    return acc;
  },
  readJsonWithTransform: async (entry, transformFn, acc) => {
    const passThrough = new PassThrough({
      objectMode: true
    });
    const stream = entry.pipe(parse('*')).pipe(passThrough);
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
    if (Object.keys(row).some((key) => typeof row[key] !== 'string')) {
      throw Error('Invalid data');
    }
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
  parseCsv: async (entry) => {
    const stream = entry.pipe(csv({ columns: true }));
    try {
      let index = 0;
      let columns = {}
      let rows = {}
      let nCells = 0;
      let nCellsReconciliated = 0;
      for await (const row of stream) {
        if (index === 0) {
          columns = ParseService.transformHeader(columns, Object.keys(row));
        }
        rows = ParseService.transformRow(rows, row, index);
        index++;
      }
      nCells = Object.keys(rows).length * Object.keys(columns).length
      const data = { columns, rows, nCells, nCellsReconciliated }
      stream.end();
      return { status: 'success', data };
    } catch (err) {
      entry.destroy();
      return { status: 'error' }
    }

  },
  parseJson: async (entry) => {
    try {
      let nCells = 0;
      let nCellsReconciliated = 0;
      const rows = await ParseService.readJsonWithTransform(
        entry,
        ParseService.transformRow,
        {}
      )
      const header = Object.keys(rows[Object.keys(rows)[0]].cells);
      const columns = ParseService.transformHeader({}, header);
      nCells = Object.keys(rows).length * Object.keys(columns).length
      const data = { columns, rows, nCells, nCellsReconciliated };
      return { status: 'success', data };
    } catch (err) {
      entry.destroy();
      return { status: 'error' }
    }

  },
  checkJsonFormat: async (entry) => {
    const passThrough = new PassThrough({
      objectMode: true
    });
    const stream = entry.pipe(parse('*')).pipe(passThrough);
    let format = 'raw';

    for await (const obj of stream) {
      if (Object.keys(obj).some((key) => typeof obj[key] !== 'string')) {
        format = 'w3c';
        break;
      }
    }
    stream.end();
    return format;
  },
  parse: async (entryPath) => {

    const getStream = () => {
      return fs.createReadStream(entryPath);
    }

    const parsedCsvResult = await ParseService.parseCsv(getStream());

    if (parsedCsvResult.status === 'success') {
      return parsedCsvResult.data;
    }

    const parseJsonResult = await ParseService.parseJson(getStream());

    if (parseJsonResult.status === 'success') {
      return parseJsonResult.data;
    }

    const parseW3CResult = await ParseW3C.parse(getStream());

    if (parseW3CResult.status === 'success') {
      return parseW3CResult.data;
    }

    throw Error('Invalid file format');
  }
};

export default ParseService;
