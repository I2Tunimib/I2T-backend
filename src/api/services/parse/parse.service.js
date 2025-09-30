import fs from "fs";
import { readFile } from "fs/promises";
import csv from "csv-parse";
import { parse } from "JSONStream";
import { PassThrough } from "stream";
import yaml from "js-yaml";
import ParseW3C from "./parse-w3c.service.js";
import { cloneStream } from "../../../utils/cloneStream.js";

const ROW_LIMIT = process.env.ROW_LIMIT;

const DEFAULT_HEADER_PROPERTIES = {
  label: "",
  status: "empty",
  context: {},
  metadata: [],
};

const DEFAULT_CELL_PROPERTIES = {
  label: "",
  metadata: [],
};

const ParseService = {
  readYaml: async (path) => {
    const file = await readFile(path, "utf-8");
    return yaml.load(file);
  },
  createJsonStreamReader: (path, pattern = "*") => {
    const passThrough = new PassThrough({
      objectMode: true,
    });

    const readStream = fs.createReadStream(path, { encoding: "utf8" });
    const parser = parse(pattern);

    // Centralized error handler to avoid unhandled 'error' events from JSONStream or the read stream
    const onError = (err) => {
      console.error(
        "JSON parse error in createJsonStreamReader:",
        err && err.message ? err.message : err,
      );
      try {
        // best-effort cleanup
        readStream.destroy();
      } catch (e) {}
      try {
        passThrough.end();
      } catch (e) {}
    };

    // Attach listeners to prevent the parser or streams from emitting unhandled 'error'
    readStream.on("error", onError);
    parser.on("error", onError);
    passThrough.on("error", onError);

    return readStream.pipe(parser).pipe(passThrough);
  },
  getPushFunction: (acc) => {
    if (Array.isArray(acc)) {
      return (item) => {
        acc.push(item);
      };
    }
    return (item) => {
      acc[item.id] = item;
    };
  },
  readJsonFile: async ({
    path,
    pattern,
    condition,
    transformFn,
    stopAtFirst = false,
    acc = [],
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
          push(transformFn ? transformFn(obj) : obj);
        }
      } else {
        push(transformFn ? transformFn(obj) : obj);
      }
    }
    stream.end();
    return acc;
  },
  findOneInJson: async ({ path, pattern, condition, transformFn }) => {
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
  unzip: async ({ filePath, destination, transformFn }) => {
    const zip = createReadStream(filePath).pipe(
      unzipper.Parse({ forceStream: true }),
    );
    let nFiles = 0;

    for await (const entry of zip) {
      const { path, type } = entry.path;

      if (type === "File") {
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
  readCsvWithTransform: async (entry, parserOptions, transformFn, acc) => {
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
      objectMode: true,
    });

    const parser = parse("*");
    let parseErr = null;
    // Capture parser errors and perform safe cleanup. We record the error and allow the async iterator to finish.
    parser.on("error", (err) => {
      parseErr = err;
      console.error(
        "JSON parse error in readJsonWithTransform:",
        err && err.message ? err.message : err,
      );
      try {
        entry.destroy();
      } catch (e) {}
      try {
        passThrough.end();
      } catch (e) {}
    });

    const stream = entry.pipe(parser).pipe(passThrough);
    let index = 0;
    try {
      for await (const row of stream) {
        acc = transformFn(acc, row, index);
        index++;
      }
      if (parseErr) throw parseErr;
      stream.end();
      return acc;
    } catch (err) {
      console.error(
        "readJsonWithTransform: error while reading JSON stream:",
        err && err.message ? err.message : err,
      );
      // Do NOT destroy the `entry` stream here. Destroying the stream while another async iterator
      // is consuming a PassThrough can lead to an AbortError being emitted from the PassThrough
      // which — if not properly handled — can crash the process. Let callers decide how to clean up.
      throw err;
    } finally {
      parser.removeAllListeners && parser.removeAllListeners("error");
      passThrough.removeAllListeners && passThrough.removeAllListeners("error");
    }
  },
  transformRow: (acc, row, index) => {
    const id = `r${index}`;
    // If any cell is not a string, skip the row instead of throwing.
    // Throwing inside a transform which is called while iterating a stream can cause the stream
    // to be destroyed and emit an unhandled 'error' / AbortError in upstream pass-throughs.
    const invalidKey = Object.keys(row).find(
      (key) => typeof row[key] !== "string",
    );
    if (invalidKey !== undefined) {
      console.warn(
        "transformRow: skipping row due to non-string cell",
        invalidKey,
        row[invalidKey],
        typeof row[invalidKey],
      );
      // swallow invalid row: do not add it to `acc`
      return acc;
    }
    const cells = Object.keys(row).reduce((acc, column) => {
      acc[column] = {
        id: `${id}$${column}`,
        ...DEFAULT_CELL_PROPERTIES,
        label: row[column] || "",
      };
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
        label: column,
      };
      return columns;
    }, acc);
  },
  parseCsv: async (entry) => {
    // // Flavio
    // fs.writeFile('../../fileSemTUI/parse-entry.json', JSON.stringify(entry), function (err) {
    //     if (err) throw err;
    //     console.log('*** dataset.service.js : File ../../fileSemTUI/parse-entry.json saved!');
    // });
    const stream = entry.pipe(csv({ columns: true }));
    try {
      let index = 0;
      let columns = {};
      let rows = {};
      let nCells = 0;
      let nCellsReconciliated = 0;
      for await (const row of stream) {
        if (index > ROW_LIMIT - 1) {
          break; // Exit the loop when index is greater than 91
        }
        if (index === 0) {
          columns = ParseService.transformHeader(columns, Object.keys(row));
        }
        rows = ParseService.transformRow(rows, row, index);
        // console.log(`*** dataset.service.js : ${JSON.stringify(index)} \n ${JSON.stringify(rows)}\n\n`);
        index++;
      }
      nCells = Object.keys(rows).length * Object.keys(columns).length;
      const data = { columns, rows, nCells, nCellsReconciliated };
      stream.end();
      return { status: "success", data };
    } catch (err) {
      console.error(
        "parseCsv: error while parsing CSV:",
        err && err.message ? err.message : err,
      );
      // Avoid destroying the entry here — let the caller handle cleanup to prevent AbortError.
      return { status: "error" };
    }
  },
  parseJson: async (entry) => {
    try {
      let nCells = 0;
      let nCellsReconciliated = 0;
      const rows = await ParseService.readJsonWithTransform(
        entry,
        ParseService.transformRow,
        {},
      );
      const header = Object.keys(rows[Object.keys(rows)[0]].cells);
      const columns = ParseService.transformHeader({}, header);
      nCells = Object.keys(rows).length * Object.keys(columns).length;
      const data = { columns, rows, nCells, nCellsReconciliated };
      return { status: "success", data };
    } catch (err) {
      console.log("error parsing json", err);
      // Avoid destroying the entry here to prevent aborts in upstream stream consumers.
      // The caller (e.g. upload handling code) should perform any necessary cleanup.
      return { status: "error" };
    }
  },
  checkJsonFormat: async (entry) => {
    const passThrough = new PassThrough({
      objectMode: true,
    });

    const parser = parse("*");
    let format = "raw";
    let parseErr = null;

    // Prevent unhandled errors and record parse errors
    parser.on("error", (err) => {
      parseErr = err;
      console.error(
        "JSON parse error in checkJsonFormat:",
        err && err.message ? err.message : err,
      );
      try {
        entry.destroy();
      } catch (e) {}
      try {
        passThrough.end();
      } catch (e) {}
    });

    const stream = entry.pipe(parser).pipe(passThrough);

    for await (const obj of stream) {
      if (Object.keys(obj).some((key) => typeof obj[key] !== "string")) {
        format = "w3c";
        break;
      }
    }

    if (parseErr) {
      // invalid JSON detected — treat as raw and let caller handle/report
      return "raw";
    }

    stream.end();
    parser.removeAllListeners("error");
    passThrough.removeAllListeners("error");
    return format;
  },
  parse: async (entryPath) => {
    const getStream = () => {
      return fs.createReadStream(entryPath);
    };

    const parsedCsvResult = await ParseService.parseCsv(getStream());

    if (parsedCsvResult.status === "success") {
      return parsedCsvResult.data;
    }

    const parseJsonResult = await ParseService.parseJson(getStream());

    if (parseJsonResult.status === "success") {
      return parseJsonResult.data;
    }

    const parseW3CResult = await ParseW3C.parse(getStream());

    if (parseW3CResult.status === "success") {
      return parseW3CResult.data;
    }

    throw Error("Invalid file format");
  },
};

export default ParseService;
