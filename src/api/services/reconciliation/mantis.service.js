import FileSystemService from "../datasets/datasets.service.js";
import ExportService from "../export/export.service.js";
import ParseW3C from "../parse/parse-w3c.service.js";
import { nanoid } from "nanoid";
import { writeFile, readFile } from "fs/promises";
import { createReadStream } from "fs";
import { concatLimit, queue } from "async";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import { KG_INFO } from "../../../utils/constants.js";
import config from "../../../config/index.js";
import { log } from "../../../utils/log.js";
import { table } from "console";

const __dirname = path.resolve();
const TAGS = {
  LIT: "literal",
  SUBJ: "entity",
  NE: "entity",
};

function getCurrentTime() {
  // Create a new Date object
  const currentDate = new Date();

  // Get the current time components
  let currentHours = currentDate.getHours();
  let currentMinutes = currentDate.getMinutes();
  let currentSeconds = currentDate.getSeconds();
  let currentMilliseconds = currentDate.getMilliseconds();

  // Format the time components with leading zeros if necessary
  currentHours = currentHours < 10 ? "0" + currentHours : currentHours;
  currentMinutes = currentMinutes < 10 ? "0" + currentMinutes : currentMinutes;
  currentSeconds = currentSeconds < 10 ? "0" + currentSeconds : currentSeconds;
  currentMilliseconds =
    currentMilliseconds < 10
      ? "00" + currentMilliseconds
      : currentMilliseconds < 100
        ? "0" + currentMilliseconds
        : currentMilliseconds;

  // Return the current time in the format "hh:mm:ss:ms"
  return `${currentHours}:${currentMinutes}:${currentSeconds}:${currentMilliseconds}`;
}

const getAnnotationRequest = (idDataset, idTable, { rows, columns }) => {
  // Build payload matching new Alligator `POST /dataset/{datasetName}/table/json` API
  const columnKeys = Object.keys(columns);
  const data = Object.values(rows).map((row) => {
    const obj = {};
    columnKeys.forEach((colKey) => {
      const cell = row.cells[colKey];
      obj[colKey] = cell ? cell.label : null;
    });
    return obj;
  });
  return {
    table_name: idTable,
    header: columnKeys,
    total_rows: data.length,
    data: data,
  };
};
const transformMetadata = (table, metadata) => {
  const columnKeys = Object.keys(table.columns);
  const { column } = metadata;
  column.forEach((item, index) => {
    const { idColumn, tag } = item;
    table.columns[columnKeys[idColumn]] = {
      ...table.columns[columnKeys[idColumn]],
      ...(tag === "SUBJ" && { role: "subject" }),
      kind: TAGS[tag],
    };
  });
  return table;
};
const transformCTA = (table, cta) => {
  // 	console.log("**** mantis transformCTA: table", JSON.stringify(table));
  //	console.log("**** mantis transformCTA: cta", JSON.stringify(cta));
  const columnKeys = Object.keys(table.columns);
  cta.forEach((item, index) => {
    //	    console.log("**** mantis transformCTA: item", JSON.stringify(item));
    const types = item.types.map((type) => {
      //	    console.log("**** mantis transformCTA: type", JSON.stringify(type));
      return {
        id: `wd:${type.id}`,
        match: index === 0,
        name: `${type.name}`,
        score: `${type.score}`,
      };
    });
    table.columns[columnKeys[item.idColumn]].metadata = [
      {
        type: types,
        property: [],
      },
    ];
  });
  return table;
};
const getCEAMetadata = (entities) => {
  let lowestScore = 0;
  let highestScore = 0;
  let match = null;
  if (entities.length > 0) {
    match = entities[0]["match"]
      ? {
          value: true,
          reason: "reconciliator",
        }
      : {
          value: false,
          reason: "reconciliator",
        };
  } else {
    match = { value: false };
  }
  const meta = entities.map((entity, index) => {
    //  console.log("**** mantis service: entity, index ", entity, index);
    const { id: entityId, score, types = [], name, match, ...rest } = entity;
    const id = `wd:${entityId}`;
    if (index === 0) {
      lowestScore = score;
      highestScore = score;
    } else {
      lowestScore = score < lowestScore ? score : lowestScore;
      highestScore = score > highestScore ? score : highestScore;
    }
    // console.log("**** mantis service: types ", types);
    return {
      id,
      type: types.map((item) => {
        return {
          ...item,
          id: `wd:${item.id}`,
        };
      }),
      score,
      ...rest,
      match: match,
      name: {
        value: name,
        uri: `${KG_INFO.wd.uri}${entityId}`,
      },
    };
  });
  return {
    metadata: meta,
    highestScore,
    lowestScore,
    match,
  };
};
const transformCPA = (table, cpa) => {
  //	console.log("**** mantis transformCPA: cpa", JSON.stringify(cpa));
  const columnKeys = Object.keys(table.columns);
  cpa.forEach((item, index) => {
    //	    console.log("**** mantis transformCPA: item", JSON.stringify(item));
    const { idSourceColumn, idTargetColumn, predicates } = item;
    const propertyItem = {
      id: `wd:${predicates[0].id}`,
      obj: columnKeys[idTargetColumn],
      name: `${predicates[0].name}`,
      match: true,
      score: `${predicates[0].score}`,
    };
    table.columns[columnKeys[idSourceColumn]].metadata[0] = {
      ...table.columns[columnKeys[idSourceColumn]].metadata[0],
      property: [
        ...table.columns[columnKeys[idSourceColumn]].metadata[0].property,
        propertyItem,
      ],
    };
  });
  return table;
};
const transformCEA = (table, cea) => {
  const columnKeys = Object.keys(table.columns);
  columnKeys.forEach((colId) => {
    table.columns[colId] = {
      ...table.columns[colId],
      context: {
        wd: {
          prefix: "wd:",
          uri: "https://www.wikidata.org/entity/",
          total:
            table.columns[colId].kind === "entity"
              ? Object.keys(table.rows).length
              : 0,
          reconciliated: 0,
        },
      },
    };
  });
  let minMetaScore = 0;
  let maxMetaScore = 0;
  cea.forEach((item) => {
    const { idRow, idColumn, entities } = item;
    const { metadata, highestScore, lowestScore, match } =
      getCEAMetadata(entities);
    if (match.value) {
      table.columns[columnKeys[idColumn]].context.wd.reconciliated += 1;
    }
    minMetaScore = lowestScore < minMetaScore ? lowestScore : minMetaScore;
    maxMetaScore = highestScore > maxMetaScore ? highestScore : maxMetaScore;
    table.rows[`r${idRow}`].cells[columnKeys[idColumn]] = {
      ...table.rows[`r${idRow}`].cells[columnKeys[idColumn]],
      metadata,
      annotationMeta: {
        ...(table.columns[columnKeys[idColumn]].kind === "entity" && {
          annotated: true,
        }),
        match,
        lowestScore,
        highestScore,
      },
    };
  });
  const nCellsReconciliated = Object.values(table.columns).reduce(
    (accTotal, col) => {
      const totalContext = Object.values(col.context).reduce(
        (acc, ctx) => acc + ctx.reconciliated,
        0,
      );
      return accTotal + totalContext;
    },
    0,
  );
  return {
    ...table,
    table: {
      ...table.table,
      nCellsReconciliated,
      mantisStatus: "DONE",
      minMetaScore,
      maxMetaScore,
    },
  };
};
const {
  MANTIS,
  MANTIS_AUTH_TOKEN,
  mantisObjs: { cronsMap },
  helpers: { getDatasetDbPath, getTablesDbPath, getDatasetFilesPath },
} = config;
// create queue so that writes to file are not lost or are conflicting
const writeQueue = queue(async (task, completed) => {
  await task();
}, 1);
const handleAnnotationCompletion = async ({ idDataset, idTable }) => {
  // get table data
  const table = await FileSystemService.findTable(idDataset, idTable);
  // get mantis table data
  const mantisTable = await MantisService.getTable(idDataset, idTable);
  let data;
  // save table
  await writeQueue.push(async () => {
    try {
      const { metadata } = mantisTable;
      const { cea, cta, cpa } = mantisTable.semanticAnnotations;
      //		console.log("**** mantis handleAnnotationCompletion: cta", JSON.stringify(cta));
      let tableData = table;
      console.log("annotated table data", JSON.stringify(mantisTable));
      tableData = transformMetadata(tableData, metadata);
      tableData = transformCTA(tableData, cta);
      tableData = transformCPA(tableData, cpa);
      tableData = transformCEA(tableData, cea);
      const { table: tableInfo, columns, rows } = tableData;
      ParseW3C.updateColumnsStatus(columns, rows);
      // update db entry
      const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()));
      tables[idTable] = {
        ...tableInfo,
        lastModifiedDate: new Date().toISOString(),
      };
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
      // update table data
      await writeFile(
        `${getDatasetFilesPath()}/${idDataset}/${idTable}.json`,
        JSON.stringify({ columns, rows }),
      );
      data = {
        table: tables[idTable],
        columns,
        rows,
      };
    } catch (err) {
      console.log(err);
    }
  });
  return data;
};
const clearCron = (cronId) => {
  const cron = cronsMap[cronId];
  clearInterval(cron);
  delete cronsMap[cronId];
  log(
    "mantis",
    `Finished tracking for ${cronId} - current time: ${getCurrentTime()}`,
  );
};
const startCron = ({ idDataset, idTable, io }) => {
  log(
    "mantis",
    `Started tracking for ${idDataset}_${idTable} - current time: ${getCurrentTime()}`,
  );
  // check every 30 seconds
  const intervalId = setInterval(async () => {
    try {
      const result = await MantisService.getTable(idDataset, idTable);
      if (!result) return;
      // Determine status from multiple possible response shapes
      const statusCandidate =
        result.status ||
        (result.table && result.table.status) ||
        (result.data && result.data.status) ||
        (result.data && result.data.data && result.data.data.status) ||
        null;
      const status =
        typeof statusCandidate === "string"
          ? statusCandidate.toUpperCase()
          : null;
      log("mantis", `Polled ${idDataset}_${idTable} status=${statusCandidate}`);

      // Additionally, if the response includes per-row info, consider the table finished
      // when all rows report status DONE (some Alligator responses only update rows).
      const rowsCandidate =
        result.rows ||
        (result.data && result.data.rows) ||
        (result.table && result.table.rows) ||
        (result.data && result.data.data && result.data.data.rows) ||
        null;
      if (Array.isArray(rowsCandidate) && rowsCandidate.length > 0) {
        log(
          "mantis",
          `Polled ${idDataset}_${idTable} rows=${rowsCandidate.length}`,
        );
      }

      // Only consider annotation complete when the table-level status is DONE/FINISHED.
      // Row-level "DONE" is set after the candidate step but BEFORE the ML pipeline runs,
      // so using allRowsDone as a trigger causes premature completion with empty linked_entities.
      if (status === "DONE" || status === "FINISHED") {
        // remove cron
        clearCron(`${idDataset}_${idTable}`);
        // process and save annotated table
        const annotatedTable = await handleAnnotationCompletion({
          idDataset,
          idTable,
        });
        // emit to client annotated table
        io.emit("done", annotatedTable);
      }
    } catch (err) {
      // don't let a single poll failure crash the cron; log and continue
      console.log(
        `Error polling table ${idDataset}_${idTable}:`,
        err?.message || err,
      );
    }
  }, 30000);
  cronsMap[`${idDataset}_${idTable}`] = intervalId;
};
const MantisService = {
  getTable: async (idDataset, idTable) => {
    // Try new Alligator GET endpoint, with fallback to legacy path.
    const urls = [
      // ask for all rows (limit=0 => no pagination on server)
      `${MANTIS}/datasets/${idDataset}/tables/${idTable}?token=${MANTIS_AUTH_TOKEN}&limit=0`,
      `${MANTIS}/dataset/${idDataset}/table/${idTable}?page=1&per_page=90&token=${MANTIS_AUTH_TOKEN}`,
    ];
    for (const url of urls) {
      try {
        const result = await axios.get(url);
        // response may be { data: { ... } } or the payload directly
        if (result.data && result.data.data) return result.data.data;
        return result.data;
      } catch (err) {
        if (err?.response?.status === 404) {
          // try next fallback
          continue;
        }
        // propagate other errors
        throw err;
      }
    }
    return null;
  },
  checkPendingTable: async (io) => {
    // if there are table pending the server stopped while Mantis
    // annotation processes were undergoing
    const pendingTables = await FileSystemService.findTables(
      (table) => table.mantisStatus === "PENDING",
    );
    log("mantis", `There are ${pendingTables.length} pending tables`);
    for (const table of pendingTables) {
      const { id: idTable, idDataset } = table;
      // const { mantisId: mantisDatasetId } = await FileSystemService.findOneDataset(localDatasetId);
      const result = await MantisService.getTable(idDataset, idTable);
      if (result) {
        if (result.status === "DONE") {
          const annotatedTable = await handleAnnotationCompletion({
            idDataset,
            idTable,
          });
          // emit to client annotated table
          io.emit("done", annotatedTable);
        } else {
          startCron({ idDataset, idTable, io });
        }
      }
    }
  },
  annotate: async (idDataset, idTable, data) => {
    const req = getAnnotationRequest(idDataset, idTable, data);

    // Post to Alligator create endpoint
    try {
      const result = await axios.post(
        `${MANTIS}/dataset/${idDataset}/table/json?token=${MANTIS_AUTH_TOKEN}`,
        req,
      );
      // normalize to previous expected shape
      return { status: "Ok", result: result.data };
    } catch (err) {
      // If table already exists, Alligator returns 400 with detail message.
      const detail = err?.response?.data?.detail;
      if (
        typeof detail === "string" &&
        detail.includes("Table with this name already exists")
      ) {
        // Treat as OK: the table exists, start tracking its annotation status
        return { status: "Ok", message: "table_exists" };
      }
      // rethrow other errors
      throw err;
    }
  },
  trackAnnotationStatus: async ({ idDataset, idTable, ...rest }) => {
    // start cron to check annotation status every 30 seconds
    startCron({ idDataset, idTable, ...rest });
    // update status to pending
    const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()));
    tables[idTable] = {
      ...tables[idTable],
      mantisStatus: "PENDING",
    };
    console.log();
    await writeFile(
      getTablesDbPath(),
      JSON.stringify({ meta, tables }, null, 2),
    );
  },
};
export default MantisService;
