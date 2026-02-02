import { readFile, mkdir, writeFile, rm, readdir } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { queue } from "async";
import unzipper from "unzipper";
import { spawn } from "child_process";
import ParseService from "../parse/parse.service.js";
import MantisService from "../reconciliation/mantis.service.js";
import config from "../../../config/index.js";
import path from "path";
import { KG_INFO } from "../../../utils/constants.js";
import { log } from "../../../utils/log.js";
import ParseW3C from "../parse/parse-w3c.service.js";
import { nanoid } from "nanoid";

const __dirname = path.resolve();

const { getDatasetDbPath, getTablesDbPath, getDatasetFilesPath, getTmpPath } =
  config.helpers;

const COLLECTION_DATASETS_MAP = {
  name: {
    label: "Name",
    type: "link", //'date' | 'percentage' | 'tag' | 'link',
    props: {
      url: "/datasets/:id/tables",
    },
  },
  description: {
    label: "Description",
  },
  nTables: {
    label: "N. Tables",
  },
  mentions: {
    label: "N. Mentions",
  },
  lastModifiedDate: {
    label: "Last Modified",
    type: "date",
  },
};

const COLLECTION_TABLES_MAP = {
  name: {
    label: "Name",
    type: "link",
    props: {
      url: "/datasets/:idDataset/tables/:id",
      queryParams: "?view=table",
    },
  },
  nCols: {
    label: "N. Cols",
  },
  nRows: {
    label: "N. Rows",
  },
  completion: {
    label: "Completion",
    type: "percentage",
  },
  lastModifiedDate: {
    label: "Last Modified",
    type: "date",
  },
};

// create queue so that writes to file are not lost
const writeQueue = queue(async (task, completed) => {
  await task();
}, 1);

const FileSystemService = {
  zip: async (inputFile, outputFile, timeout = 1000 * 60 * 5) => {
    return new Promise((resolve, reject) => {
      const subprocess = spawn("zip", ["-j", outputFile, inputFile], {
        shell: false,
        stdio: "ignore",
        cwd: __dirname,
      });

      //failed to spawn process
      subprocess.on("error", reject);

      const t = setTimeout(() => {
        subprocess.kill();
        reject(new Error("TIMEDOUT"));
      }, timeout);

      //process exited
      subprocess.on("exit", (code, signal) => {
        clearTimeout(t);
        if (code === 0) {
          resolve();
        } else {
          reject(code || signal);
        }
      });
    });
  },
  deleteFiles: async (pattern) => {
    const files = await readdir(getTmpPath());
    for (const file of files) {
      if (file.match(pattern)) {
        rm(`${getTmpPath()}/${file}`);
      }
    }
  },
  findOneDataset: async (idDataset) => {
    return ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: "datasets.*",
      acc: [],
      stopAtFirst: true,
      condition: ({ id }) => id === idDataset,
    });
  },
  findAllDatasets: async () => {
    const datasets = await ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: "datasets.*",
      acc: [],
    });
    return {
      meta: COLLECTION_DATASETS_MAP,
      collection: datasets,
    };
  },
  findDatasetsByUser: async (id) => {
    const datasets = await ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: "datasets.*",
      acc: [],
      condition: ({ userId }) => userId === id,
    });
    return {
      meta: COLLECTION_DATASETS_MAP,
      collection: datasets,
    };
  },
  findAllTablesByDataset: async (idDataset) => {
    const tables = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      acc: [],
      transformFn: (item) => {
        const { nCells, nCellsReconciliated, ...rest } = item;
        return {
          ...rest,
          completion: {
            total: nCells,
            value: nCellsReconciliated,
          },
        };
      },
      condition: (item) => item.idDataset === idDataset,
    });
    return {
      meta: COLLECTION_TABLES_MAP,
      collection: tables,
    };
  },
  findTables: async (condition) => {
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      acc: [],
      condition,
    });
  },
  findTable: async (idDataset, idTable) => {
    const table = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      acc: [],
      condition: (item) => item.idDataset === idDataset && item.id === idTable,
      stopAtFirst: true,
    });

    const tableData = JSON.parse(
      await readFile(`${getDatasetFilesPath()}/${idDataset}/${idTable}.json`),
    );

    const { columns, rows, columnOrder } = tableData;

    return {
      table,
      columns,
      rows,
      columnOrder, // Return column order if it exists in the saved data
    };
  },
  findOneTable: async (idDataset, idTable) => {
    const table = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      acc: [],
      stopAtFirst: true,
      condition: ({ id, idDataset: currentIdDataset }) =>
        currentIdDataset === idDataset && id === idTable,
    });
    return table;
  },
  findTablesByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      condition: (obj) => {
        return regex.test(obj.name.toLowerCase());
      },
    });
  },
  findTablesByNameAndUser: async (query, userId) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      condition: async (obj) => {
        const dataset = await FileSystemService.findOneDataset(obj.idDataset);
        return dataset.userId === userId && regex.test(obj.name.toLowerCase());
      },
    });
  },
  findDatasetsByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: "datasets.*",
      condition: (obj) => regex.test(obj.name.toLowerCase()),
    });
  },
  findDatasetsByNameAndUser: async (query, userId) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: "datasets.*",
      condition: (obj) =>
        userId === obj.userId && regex.test(obj.name.toLowerCase()),
    });
  },
  addDataset: async (filePath, datasetName, userId) => {
    let newDatasets = {};
    let newTables = {};

    // Validate inputs to prevent potential errors
    if (!datasetName) {
      throw new Error("Dataset name is required");
    }

    if (userId === null || userId === undefined) {
      throw new Error("User ID is required");
    }

    const writeTempFile = async (readStream) => {
      const id = nanoid();
      // ensure tmp path exists and use configured tmp path
      await mkdir(getTmpPath(), { recursive: true });
      const tmpFilePath = `${getTmpPath()}/${id}`;
      const ws = createWriteStream(tmpFilePath, { flags: "a" });
      readStream.pipe(ws);

      return new Promise((resolve, reject) => {
        readStream.on("end", () => {
          resolve(id);
        });
        readStream.on("error", () => {
          reject("Error writing temp file");
        });
      });
    };

    await writeQueue.push(async () => {
      try {
        // read db datasets
        const { meta: metaDatasets, datasets } = JSON.parse(
          await readFile(getDatasetDbPath()),
        );

        metaDatasets.lastIndex += 1;
        const datasetFolderPath = `${getDatasetFilesPath()}/${
          metaDatasets.lastIndex
        }`;
        // create dataset folder
        await mkdir(datasetFolderPath, { recursive: true });
        // read tables datasets
        const { meta: metaTables, tables } = JSON.parse(
          await readFile(getTablesDbPath()),
        );

        let nFiles = 0;

        // Check if filePath is provided for zip file processing
        if (filePath) {
          try {
            const zip = createReadStream(filePath).pipe(
              unzipper.Parse({ forceStream: true }),
            );

            // unzip and write each file
            for await (const entry of zip) {
              const { path: entryPath, type } = entry;
              // Skip macOS metadata entries and dotfiles, drain their contents and continue
              if (
                typeof entryPath === "string" &&
                (entryPath.startsWith("__MACOSX/") ||
                  entryPath.startsWith(".") ||
                  entryPath.includes("/."))
              ) {
                entry.autodrain();
                continue;
              }

              // We accept files even if they're inside subfolders.
              // Only skip directories and non-file entries.
              if (type !== "File") {
                entry.autodrain();
                continue;
              }

              // Determine base filename and perform case-insensitive extension check
              const baseName = entryPath ? path.basename(entryPath) : "";
              const lower = baseName.toLowerCase();
              if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
                entry.autodrain();
                continue;
              }

              const tableName = baseName.replace(/\.[^.]+$/, "") || "Unnamend";

              const tmpEntryId = await writeTempFile(entry);
              const tmpEntryPath = `${getTmpPath()}/${tmpEntryId}`;

              try {
                // transform to app format and write to file
                const data = await ParseService.parse(tmpEntryPath);

                metaTables.lastIndex += 1;
                nFiles += 1;

                await writeFile(
                  `${datasetFolderPath}/${metaTables.lastIndex}.json`,
                  JSON.stringify(data),
                );

                newTables[`${metaTables.lastIndex}`] = {
                  id: `${metaTables.lastIndex}`,
                  idDataset: `${metaDatasets.lastIndex}`,
                  name: tableName,
                  nCols: Object.keys(data.columns).length,
                  nRows: Object.keys(data.rows).length,
                  nCells: data.nCells,
                  nCellsReconciliated: data.nCellsReconciliated,
                  lastModifiedDate: new Date().toISOString(),
                };
              } catch (err) {
                console.error("Error parsing zip entry:", err);
                // continue processing other entries
              } finally {
                // cleanup temp entry
                try {
                  await rm(tmpEntryPath);
                } catch (e) {
                  // ignore cleanup errors
                }
              }
            }
          } catch (err) {
            console.error("Error processing zip file:", err);
            // Continue execution to create an empty dataset even if zip processing fails
          }
        }

        // add dataset entry
        newDatasets[`${metaDatasets.lastIndex}`] = {
          id: `${metaDatasets.lastIndex}`,
          userId,
          name: datasetName,
          nTables: nFiles,
          lastModifiedDate: new Date().toISOString(),
        };
        // add dataset entry
        await writeFile(
          getDatasetDbPath(),
          JSON.stringify(
            {
              meta: metaDatasets,
              datasets: { ...datasets, ...newDatasets },
            },
            null,
            2,
          ),
        );
        // add table entries
        await writeFile(
          getTablesDbPath(),
          JSON.stringify(
            {
              meta: metaTables,
              tables: { ...tables, ...newTables },
            },
            null,
            2,
          ),
        );
        // delete temp uploaded zip if it exists
        if (filePath) {
          try {
            await rm(filePath);
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.log(err);
      }
    });
    return { datasets: newDatasets, tables: newTables };
  },

  removeDataset: async (datasetId) => {
    await writeQueue.push(async () => {
      try {
        const { meta: metaDatasets, datasets } = JSON.parse(
          await readFile(getDatasetDbPath()),
        );
        const { meta: metaTables, tables } = JSON.parse(
          await readFile(getTablesDbPath()),
        );

        // remove tables
        let nRemoved = 0;
        for (const key in tables) {
          if (tables[key].idDataset === datasetId) {
            delete tables[key];
            nRemoved += 1;
          }
        }
        const { mantisId } = datasets[datasetId];

        if (mantisId !== undefined) {
          try {
            await MantisService.deleteDataset(mantisId);
          } catch {
            log("mantis", `Dataset [${mantisId}] not found`);
          }
        }

        // remove dataset
        delete datasets[datasetId];

        // replace db
        await writeFile(
          getDatasetDbPath(),
          JSON.stringify({ meta: metaDatasets, datasets }, null, 2),
        );
        // replace db
        await writeFile(
          getTablesDbPath(),
          JSON.stringify({ meta: metaTables, tables }, null, 2),
        );

        // remove files
        try {
          await rm(`${getDatasetFilesPath()}/${datasetId}`, {
            recursive: true,
          });
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.log(err);
      }
    });
  },
  removeTable: async (datasetId, tableId) => {
    await writeQueue.push(async () => {
      const { meta: metaDatasets, datasets } = JSON.parse(
        await readFile(getDatasetDbPath()),
      );
      const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()));

      if (tables[tableId]) {
        // remove table
        if (tables[tableId].mantisId !== undefined) {
          await MantisService.deleteTable(
            datasets[datasetId].mantisId,
            tables[tableId].mantisId,
          );
        }
        delete tables[tableId];

        datasets[datasetId].nTables -= 1;
        datasets[datasetId].lastModifiedDate = new Date().toISOString();

        // replace db
        await writeFile(
          getDatasetDbPath(),
          JSON.stringify({ meta: metaDatasets, datasets }, null, 2),
        );
        // replace db
        await writeFile(
          getTablesDbPath(),
          JSON.stringify({ meta, tables }, null, 2),
        );

        try {
          // remove files
          await rm(`${getDatasetFilesPath()}/${datasetId}/${tableId}.json`);
        } catch (err) {
          console.log(err);
        }
      }
    });
  },
  addTable: async (idDataset, filePath, tableName) => {
    const generateUniqueTableName = (name, existingNames) => {
      let uniqueName = name;
      let counter = 1;
      while (existingNames.includes(uniqueName)) {
        uniqueName = `${name}_${counter}`;
        counter++;
      }
      return uniqueName;
    };
    let newDatasets = {};
    let newTables = {};

    await writeQueue.push(async () => {
      try {
        // read db datasets
        const { meta: metaDatasets, datasets } = JSON.parse(
          await readFile(getDatasetDbPath()),
        );
        // metaDatasets.lastIndex += 1;
        const datasetFolderPath = `${getDatasetFilesPath()}/${idDataset}`;
        // read tables datasets
        const { meta: metaTables, tables } = JSON.parse(
          await readFile(getTablesDbPath()),
        );

        const existingTableNames = Object.values(tables)
          .filter((table) => table.idDataset === idDataset)
          .map((table) => table.name);

        const uniqueTableName = generateUniqueTableName(
          tableName || "table",
          existingTableNames,
        );

        const zip = createReadStream(filePath).pipe(
          unzipper.Parse({ forceStream: true }),
        );

        const writeTempFile = async (readStream) => {
          const id = nanoid();
          // use configured tmp path
          await mkdir(getTmpPath(), { recursive: true });
          const tmpFilePath = `${getTmpPath()}/${id}`;
          const ws = createWriteStream(tmpFilePath, { flags: "a" });
          readStream.pipe(ws);

          return new Promise((resolve, reject) => {
            readStream.on("end", () => {
              resolve(id);
            });
            readStream.on("error", () => {
              reject("Error writing temp file");
            });
          });
        };

        // unzip and write each file
        for await (const entry of zip) {
          const { path: entryPath, type } = entry;

          // Skip macOS metadata entries and dotfiles, drain and continue
          if (
            typeof entryPath === "string" &&
            (entryPath.startsWith("__MACOSX/") ||
              entryPath.startsWith(".") ||
              entryPath.includes("/."))
          ) {
            entry.autodrain();
            continue;
          }

          // Skip non-file entries (directories), drain and continue
          if (type !== "File") {
            entry.autodrain();
            continue;
          }

          // Accept files in subfolders: use basename
          const baseName = entryPath ? path.basename(entryPath) : "";
          const lower = baseName.toLowerCase();
          if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
            entry.autodrain();
            continue;
          }

          const tableBaseName =
            baseName.replace(/\.[^.]+$/, "") || uniqueTableName;

          const tmpEntryId = await writeTempFile(entry);
          const tmpEntryPath = `${getTmpPath()}/${tmpEntryId}`;

          try {
            metaTables.lastIndex += 1;
            // transform to app format and write to file
            const data = await ParseService.parse(tmpEntryPath);

            await writeFile(
              `${datasetFolderPath}/${metaTables.lastIndex}.json`,
              JSON.stringify(data),
            );

            newTables[`${metaTables.lastIndex}`] = {
              id: `${metaTables.lastIndex}`,
              idDataset,
              name: tableBaseName,
              nCols: Object.keys(data.columns).length,
              nRows: Object.keys(data.rows).length,
              nCells: data.nCells,
              nCellsReconciliated: data.nCellsReconciliated,
              lastModifiedDate: new Date().toISOString(),
            };

            datasets[idDataset] = {
              ...datasets[idDataset],
              nTables: datasets[idDataset].nTables + 1,
            };
          } catch (err) {
            console.error("Error parsing zip entry for addTable:", err);
            // continue processing others
          } finally {
            try {
              await rm(tmpEntryPath);
            } catch (e) {}
          }
        }

        // add dataset entry (if needed) and table entries
        await writeFile(
          getDatasetDbPath(),
          JSON.stringify(
            {
              meta: metaDatasets,
              datasets: { ...datasets, ...newDatasets },
            },
            null,
            2,
          ),
        );
        await writeFile(
          getTablesDbPath(),
          JSON.stringify(
            {
              meta: metaTables,
              tables: { ...tables, ...newTables },
            },
            null,
            2,
          ),
        );
        // delete uploaded temp zip
        try {
          await rm(filePath);
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.log(err);
      }
    });
    return newTables;
  },
  updateTable: async ({
    tableInstance,
    columns: columnsRaw,
    rows: rowsRaw,
    columnOrder,
  }) => {
    const {
      id: tableId,
      idDataset: datasetId,
      name: tableName,
      nCells,
      nCellsReconciliated,
      minMetaScore,
      maxMetaScore,
    } = tableInstance;
    const { byId: columns, allIds: allIdsCols } = columnsRaw;
    const { byId: rows, allIds: allIdsRows } = rowsRaw;

    const pathToTable = `${getDatasetFilesPath()}/${datasetId}/${tableId}`;

    let newTable = {};

    await writeQueue.push(async () => {
      const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()));
      newTable = {
        ...tables[tableId],
        name: tableName,
        nRows: allIdsRows.length,
        nCols: allIdsCols.length,
        nCells,
        nCellsReconciliated,
        minMetaScore,
        maxMetaScore,
        lastModifiedDate: new Date().toISOString(),
      };

      // update table entry
      tables[tableId] = {
        ...newTable,
      };
      // write updated db
      await writeFile(
        `${getTablesDbPath()}`,
        JSON.stringify({ meta, tables }, null, 2),
      );

      // Prepare table data to save - include column order if provided
      const tableDataToSave = { columns, rows };
      if (columnOrder && Array.isArray(columnOrder)) {
        tableDataToSave.columnOrder = columnOrder;
      }

      // write updated table
      await writeFile(`${pathToTable}.json`, JSON.stringify(tableDataToSave));
    });

    return newTable;
  },
  transformMetadata: (metadata) => {
    let lowestScore = 0;
    let highestScore = 0;
    let match = {
      value: false,
    };

    const meta = metadata.map((metaItem, index) => {
      const [prefix, id] = metaItem.id.split(":");
      if (metaItem.match) {
        match = {
          value: true,
          reason: "reconciliator",
        };
      }
      if (index === 0) {
        lowestScore = metaItem.score;
        highestScore = metaItem.score;
      } else {
        lowestScore =
          metaItem.score < lowestScore ? metaItem.score : lowestScore;
        highestScore =
          metaItem.score > highestScore ? metaItem.score : highestScore;
      }
      try {
        let returnData = {
          ...metaItem,
          name: {
            value: metaItem.name,
            uri: `${KG_INFO[prefix].uri}${id}`,
          },
        };
      } catch (error) {
        console.error(
          `Error processing metadata item: ${JSON.stringify(metaItem)}`,
          error,
        );
        console.log(" failed processing", KG_INFO[prefix], prefix, id);
      }
      return {
        ...metaItem,
        name: {
          value: metaItem.name,
          uri: prefix !== "None" ? `${KG_INFO[prefix].uri}${id}` : "",
        },
      };
    });

    return {
      metadata: meta,
      highestScore,
      lowestScore,
      match,
    };
  },
  computeStats: async (tableData) => {
    const { table, columns, rows: rawRows } = tableData;

    let minMetaScore = 0;
    let maxMetaScore = 0;

    const rows = Object.keys(rawRows).reduce((acc, rowId) => {
      acc[rowId] = {
        ...rawRows[rowId],
        cells: Object.keys(rawRows[rowId].cells).reduce((accCell, colId) => {
          const { lowestScore, highestScore, match, metadata } =
            FileSystemService.transformMetadata(
              rawRows[rowId].cells[colId].metadata,
            );
          minMetaScore =
            lowestScore < minMetaScore ? lowestScore : minMetaScore;
          maxMetaScore =
            highestScore > maxMetaScore ? highestScore : maxMetaScore;
          accCell[colId] = {
            ...rawRows[rowId].cells[colId],
            annotationMeta: {
              annotated: metadata.length > 0,
              match,
              lowestScore,
              highestScore,
            },
            metadata,
          };
          return accCell;
        }, {}),
      };
      return acc;
    }, {});

    ParseW3C.updateColumnsStatus(columns, rows);

    return {
      table: {
        ...table,
        minMetaScore,
        maxMetaScore,
      },
      rows,
      columns,
    };
  },
};

export default FileSystemService;
