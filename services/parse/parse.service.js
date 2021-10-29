import fs from 'fs';
import { readFile } from 'fs/promises';
import csv from 'csv-parse';
import { parse } from 'JSONStream';
import { PassThrough } from 'stream';
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
    acc = {}, 
    pushFn
  }) => {
    const stream = ParseService.createJsonStreamReader(path, pattern);
    const push = pushFn || ParseService.getPushFunction(acc);
    for await (const obj of stream) {
      push(obj);
    }
    stream.end();
    return acc;
  },
  readJsonFileWithCondition: async ({
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

      if (condition(obj)) {
        if (stopAtFirst) {
          acc = transformFn ? transformFn(obj) : obj;
          break;
        }
        push(transformFn ? transformFn(obj) : obj)
      }
    }
    stream.end();
    return acc;
  },
  unzip: async ({
    filePath,
    destination,
    transformFn
  }) => {
    const zip = createReadStream(filePath).pipe(unzipper.Parse({forceStream: true}))
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
    const stream = entry.pipe(csv({ ...parserOptions }));
    let index = 0;
    for await (const row of stream) {
      console.log(row);
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
    let index = 0;
    let columns = {}
    let rows = {}
    for await (const row of stream) {
      if (index === 0) {
        columns = ParseService.transformHeader(columns, Object.keys(row));
      }
      rows = ParseService.transformRow(rows, row, index);
      index++;
    }
    stream.end();
    return { columns, rows }
  },
  parseJson: async (entry) => {
    const rows = await ParseService.readJsonWithTransform(
      entry, 
      ParseService.transformRow,
      {}
    )
    const header = Object.keys(rows[Object.keys(rows)[0]].cells);
    const columns = ParseService.transformHeader({}, header);
    return { columns, rows };
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
  parse: async (entry) => {
    const { path } = entry;
    const extension = path.split('.').pop()

    if (extension === 'csv') {
      return ParseService.parseCsv(entry)
    } else if (extension === 'json') {
      const entryA = entry.pipe(new PassThrough())
      const entryB = entry.pipe(new PassThrough())

      if (await ParseService.checkJsonFormat(entryA) === 'raw') {
        return ParseService.parseJson(entryB)
      }
      return ParseW3C.parse(entryB)
    }
  }
};

export default ParseService;
