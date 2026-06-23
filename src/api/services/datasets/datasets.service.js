import { readFile, mkdir, writeFile, rm, readdir } from "fs/promises";
import { createReadStream, createWriteStream, existsSync, lstatSync } from "fs";
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
import fs from "fs";

const __dirname = path.resolve();

const { getDatasetDbPath, getTablesDbPath, getDatasetFilesPath, getTmpPath } =
  config.helpers;

// --- Access control helpers ---
const userHasViewAccess = (dataset, userId) => {
  if (!dataset) return false;
  const uid = userId === null || userId === undefined ? null : String(userId);
  if (!uid) return false;
  if (String(dataset.userId) === uid) return true; // owner
  if (dataset.visibility === "public") return true; // public
  if (
    Array.isArray(dataset.viewers) &&
    dataset.viewers.map(String).includes(uid)
  )
    return true;
  if (
    Array.isArray(dataset.editors) &&
    dataset.editors.map(String).includes(uid)
  )
    return true;
  return false;
};

const userHasEditAccess = (dataset, userId) => {
  if (!dataset) return false;
  const uid = userId === null || userId === undefined ? null : String(userId);
  if (!uid) return false;
  if (String(dataset.userId) === uid) return true; // owner
  if (dataset.visibility === "public") return true; // public datasets may be edited by any authenticated user
  if (
    Array.isArray(dataset.editors) &&
    dataset.editors.map(String).includes(uid)
  )
    return true;
  return false;
};

// --- Table-level access control helpers ---
const tableHasOwnACL = (table) =>
  table && table.visibility !== undefined && table.visibility !== null;

// Combined dataset+table view check (most restrictive wins)
const tableUserHasViewAccess = (dataset, table, userId) => {
  if (!dataset || userId === null || userId === undefined) return false;
  const uid = String(userId);
  // Dataset owner always has access
  if (String(dataset.userId) === uid) return true;
  // Must pass dataset-level check first
  if (!userHasViewAccess(dataset, userId)) return false;
  // No table-level ACL → dataset access is sufficient
  if (!tableHasOwnACL(table)) return true;
  // Table is public → dataset access is sufficient
  if (table.visibility === "public") return true;
  // Table is private → check table viewers/editors
  const isTableViewer =
    Array.isArray(table.viewers) && table.viewers.map(String).includes(uid);
  const isTableEditor =
    Array.isArray(table.editors) && table.editors.map(String).includes(uid);
  return isTableViewer || isTableEditor;
};

// Combined dataset+table edit check (most restrictive wins)
const tableUserHasEditAccess = (dataset, table, userId) => {
  if (!dataset || userId === null || userId === undefined) return false;
  const uid = String(userId);
  // Dataset owner always has access
  if (String(dataset.userId) === uid) return true;
  // Must pass dataset-level edit check first
  if (!userHasEditAccess(dataset, userId)) return false;
  // No table-level ACL → dataset edit access is sufficient
  if (!tableHasOwnACL(table)) return true;
  // Table is public → dataset edit access is sufficient
  if (table.visibility === "public") return true;
  // Table is private → only table editors can edit (viewers cannot)
  const isTableEditor =
    Array.isArray(table.editors) && table.editors.map(String).includes(uid);
  return isTableEditor;
};

// Expose helpers as part of service later in the object

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
  nProperties: {
    label: "N. Properties",
  },
  completion: {
    label: "Completion",
    type: "percentage",
  },
  headerTypeMatching: {
    label: "Header Types",
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
    // Return datasets the user can view: owner, public, viewers or editors
    const raw = JSON.parse(await readFile(getDatasetDbPath()));
    const { meta = {}, datasets = {} } = raw;
    const coll = Object.values(datasets).filter((d) =>
      userHasViewAccess(d, id),
    );
    return {
      meta: COLLECTION_DATASETS_MAP,
      collection: coll,
    };
  },

  findDatasetsByNameAndUser: async (query, userId) => {
    const regex = new RegExp(query.toLowerCase());
    // Return datasets matching name that the user can view
    const raw = JSON.parse(await readFile(getDatasetDbPath()));
    const { datasets = {} } = raw;
    return Object.values(datasets).filter(
      (obj) =>
        userHasViewAccess(obj, userId) && regex.test(obj.name.toLowerCase()),
    );
  },

  findTablesByNameAndUser: async (query, userId) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      condition: async (obj) => {
        const dataset = await FileSystemService.findOneDataset(obj.idDataset);
        return (
          tableUserHasViewAccess(dataset, obj, userId) &&
          regex.test(obj.name.toLowerCase())
        );
      },
    });
  },
  findAllTablesByDataset: async (idDataset, dataset = null, userId = null) => {
    const tables = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: "tables.*",
      acc: [],
      transformFn: async (item) => {
        const { nCells, nCellsReconciliated, ...rest } = item;

        // Calculate header type matching and number of unique properties
        let headerTypeMatching = { total: 0, value: 0 };
        let nProperties = 0;
        let graph = { nodes: [], links: [] };
        try {
          const tableJsonPath = `${getDatasetFilesPath()}/${item.idDataset}/${item.id}.json`;
          const tableJsonContent = await readFile(tableJsonPath, "utf-8");
          const tableData = JSON.parse(tableJsonContent);

          if (tableData.columns && typeof tableData.columns === "object") {
            const columns = tableData.columns;

            const nodesMap = new Map();
            const clean = (str) => str ? str.trim().replace(/^\uFEFF/, '') : '';

            Object.keys(columns).forEach((colId) => {
              const column = columns[colId];
              const columnLabel = clean(column.label || colId);

              nodesMap.set(columnLabel, {
                id: columnLabel,
                label: columnLabel,
                role: column.role,
                kind: column.kind,
              });
            });

            const links = [];
            Object.keys(columns).forEach((colId) => {
              const column = columns[colId];
              const sourceLabel = clean(column.label || colId);

              if (column.metadata && Array.isArray(column.metadata)) {
                column.metadata.forEach((metaItem) => {
                  if (metaItem.property && Array.isArray(metaItem.property)) {
                    metaItem.property.forEach((prop) => {
                      const targetLabel = clean(prop.obj);
                      if (targetLabel && nodesMap.has(targetLabel)) {
                        links.push({
                          source: sourceLabel,
                          target: targetLabel,
                          label: prop.label
                        });
                      }
                    });
                  }
                });
              }
            });

            graph = {
              nodes: Array.from(nodesMap.values()),
              links: links
            }

            const totalColumns = Object.keys(columns).length;
            let matchedColumns = 0;
            const uniquePropertyIds = new Set();

            // Count columns where at least one type has match: true
            // and collect all unique properties
            for (const columnId of Object.keys(columns)) {
              const column = columns[columnId];
              if (column.metadata && Array.isArray(column.metadata)) {
                // Check if any metadata entry has a type with match: true
                const hasMatch = column.metadata.some((metaItem) => {
                  if (metaItem.type && Array.isArray(metaItem.type)) {
                    return metaItem.type.some(
                      (typeItem) => typeItem.match === true,
                    );
                  }
                  return false;
                });
                if (hasMatch) {
                  matchedColumns++;
                }

                // Collect unique properties from all metadata entries
                for (const metaItem of column.metadata) {
                  if (metaItem.property && Array.isArray(metaItem.property)) {
                    for (const prop of metaItem.property) {
                      if (prop.id) {
                        uniquePropertyIds.add(prop.id);
                      }
                    }
                  }
                }
              }
            }

            headerTypeMatching = { total: totalColumns, value: matchedColumns };
            nProperties = uniquePropertyIds.size;
          }
        } catch (err) {
          // If file cannot be read or parsed, return default values
          headerTypeMatching = { total: 0, value: 0 };
          nProperties = 0;
        }

        return {
          ...rest,
          completion: {
            total: nCells,
            value: nCellsReconciliated,
          },
          headerTypeMatching,
          nProperties,
          graph,
        };
      },
      condition: (item) => {
        if (item.idDataset !== idDataset) return false;
        // If dataset and userId are provided, apply combined ACL filter
        if (dataset && userId !== null) {
          return tableUserHasViewAccess(dataset, item, userId);
        }
        return true;
      },
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
      const ws = createWriteStream(`tmp/${id}`, { flags: "a" });
      readStream.pipe(ws);

      return new Promise((resolve, reject) => {
        ws.on("finish", () => {
          resolve(id);
        });
        ws.on("error", (err) => {
          reject(new Error(`Error writing temp file: ${err.message}`));
        });
        readStream.on("error", (err) => {
          reject(new Error(`Error reading stream: ${err.message}`));
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
            console.log("[DEBUG] Starting zip file processing for:", filePath);
            const zip = createReadStream(filePath).pipe(
              unzipper.Parse({ forceStream: true }),
            );

            // unzip and write each file
            for await (const entry of zip) {
              const { path, type } = entry;
              console.log(
                "[DEBUG] Processing entry - path:",
                path,
                "type:",
                type,
              );
              // Skip macOS metadata entries and dotfiles, drain their contents and continue
              if (
                typeof path === "string" &&
                (path.startsWith("__MACOSX/") ||
                  path.startsWith(".") ||
                  path.includes("/."))
              ) {
                console.log("[DEBUG] Skipping macOS/dotfile:", path);
                entry.autodrain();
                continue;
              }
              // Skip non-file entries (directories)
              if (type !== "File") {
                console.log(
                  "[DEBUG] Skipping non-file entry:",
                  path,
                  "type:",
                  type,
                );
                entry.autodrain();
                continue;
              }
              // skip non compatible file formats (drain before continuing)
              if (!path.endsWith(".csv") && !path.endsWith(".json")) {
                console.log("[DEBUG] Skipping non-CSV/JSON file:", path);
                entry.autodrain();
                continue;
              }
              const tableName = path.split(".")[0] || "Unnamend";
              console.log("[DEBUG] Processing valid table file:", tableName);

              const tmpEntryId = await writeTempFile(entry);
              console.log("[DEBUG] Temp file written with id:", tmpEntryId);

              metaTables.lastIndex += 1;
              nFiles += 1;
              // transform to app format and write to file
              console.log("[DEBUG] Parsing file tmp/" + tmpEntryId);
              const data = await ParseService.parse(`tmp/${tmpEntryId}`);
              console.log(
                "[DEBUG] Parse complete. Columns:",
                Object.keys(data.columns).length,
                "Rows:",
                Object.keys(data.rows).length,
              );
              await writeFile(
                `${datasetFolderPath}/${metaTables.lastIndex}.json`,
                JSON.stringify(data),
              );
              console.log(
                "[DEBUG] Table file written:",
                `${datasetFolderPath}/${metaTables.lastIndex}.json`,
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
                visibility: null,
                viewers: [],
                editors: [],
              };

              await rm(`tmp/${tmpEntryId}`);
              console.log("[DEBUG] Table added successfully:", tableName);
            }
            console.log(
              "[DEBUG] Zip processing complete. Total tables:",
              nFiles,
            );
          } catch (err) {
            console.error("Error processing zip file:", err);
            throw new Error(`Failed to process zip file: ${err.message}`);
          }
        } else {
          console.log("[DEBUG] No filePath provided, creating empty dataset");
        }

        // add dataset entry
        newDatasets[`${metaDatasets.lastIndex}`] = {
          id: `${metaDatasets.lastIndex}`,
          userId,
          name: datasetName,
          nTables: nFiles,
          lastModifiedDate: new Date().toISOString(),
          // Access control fields
          visibility: "private", // 'private' | 'public'
          viewers: [], // array of user ids who can view
          editors: [String(userId)], // array of user ids who can edit (owner included)
        };
        // add dataset entry
        console.log(
          "[DEBUG] Writing dataset to DB. New datasets:",
          Object.keys(newDatasets),
        );
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
        console.log(
          "[DEBUG] Writing tables to DB. New tables:",
          Object.keys(newTables),
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
        // delete temp file if it exists
        if (filePath) {
          await rm(filePath);
        }
      } catch (err) {
        console.error("Error in addDataset:", err);
        throw err;
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
        await rm(`${getDatasetFilesPath()}/${datasetId}`, { recursive: true });
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
          tableName,
          existingTableNames,
        );

        const zip = createReadStream(filePath).pipe(
          unzipper.Parse({ forceStream: true }),
        );

        const writeTempFile = async (readStream) => {
          const id = nanoid();
          const ws = createWriteStream(`tmp/${id}`, { flags: "a" });
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
          const { path, type } = entry;

          // Skip macOS metadata entries and dotfiles, drain and continue
          if (
            typeof path === "string" &&
            (path.startsWith("__MACOSX/") ||
              path.startsWith(".") ||
              path.includes("/."))
          ) {
            entry.autodrain();
            continue;
          }

          // Skip non-file entries or files inside subfolders, drain and continue
          if (type !== "File" || path.includes("/")) {
            entry.autodrain();
            continue;
          }

          const tmpEntryId = await writeTempFile(entry);

          metaTables.lastIndex += 1;
          // transform to app format and write to file
          const data = await ParseService.parse(`tmp/${tmpEntryId}`);

          await writeFile(
            `${datasetFolderPath}/${metaTables.lastIndex}.json`,
            JSON.stringify(data),
          );

          newTables[`${metaTables.lastIndex}`] = {
            id: `${metaTables.lastIndex}`,
            idDataset,
            name: uniqueTableName,
            nCols: Object.keys(data.columns).length,
            nRows: Object.keys(data.rows).length,
            nCells: data.nCells,
            nCellsReconciliated: data.nCellsReconciliated,
            lastModifiedDate: new Date().toISOString(),
            visibility: null,
            viewers: [],
            editors: [],
          };

          datasets[idDataset] = {
            ...datasets[idDataset],
            nTables: datasets[idDataset].nTables + 1,
          };

          await rm(`tmp/${tmpEntryId}`);
        }

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
        // delete temp files
        await rm(filePath);
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
      compliance,
    } = tableInstance;
    const { byId: columns, allIds: allIdsCols } = columnsRaw;
    const { byId: rows, allIds: allIdsRows } = rowsRaw;

    console.log("DEBUG: updateTable received columnOrder:", columnOrder);
    console.log("DEBUG: updateTable received allIdsCols:", allIdsCols);

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
        ...(compliance && { compliance }), // Preserve compliance data if present
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
        console.log("DEBUG: Saving columnOrder to file:", columnOrder);
      } else {
        console.log("DEBUG: No columnOrder to save");
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
  // expose access helpers
  userCanView: (dataset, userId) => userHasViewAccess(dataset, userId),
  userCanEdit: (dataset, userId) => userHasEditAccess(dataset, userId),

  // Expose table-level access helpers
  tableUserCanView: (dataset, table, userId) =>
    tableUserHasViewAccess(dataset, table, userId),
  tableUserCanEdit: (dataset, table, userId) =>
    tableUserHasEditAccess(dataset, table, userId),

  // ACL modifiers
  addViewer: async (datasetId, targetUserId, actingUser) => {
    // only owner can modify ACL
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId) {
      throw new Error("Unauthorized to modify ACL");
    }
    // ensure target user exists in local users DB
    const usersPath = config.helpers.getUsersPath();
    const usersRaw = JSON.parse(await fs.promises.readFile(usersPath, "utf8"));
    const target = Object.values(usersRaw.users || {}).find(
      (u) => String(u.id) === String(targetUserId),
    );
    if (!target) throw new Error("Target user not found in users DB");

    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getDatasetDbPath()));
      const { meta = {}, datasets = {} } = raw;
      const ds = datasets[datasetId];
      if (!ds) throw new Error("Dataset not found");
      ds.viewers = ds.viewers || [];
      const uid = String(targetUserId);
      if (!ds.viewers.map(String).includes(uid)) ds.viewers.push(uid);
      await writeFile(
        getDatasetDbPath(),
        JSON.stringify({ meta, datasets }, null, 2),
      );
    });

    return await FileSystemService.findOneDataset(datasetId);
  },

  removeViewer: async (datasetId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId) {
      throw new Error("Unauthorized to modify ACL");
    }
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getDatasetDbPath()));
      const { meta = {}, datasets = {} } = raw;
      const ds = datasets[datasetId];
      if (!ds) throw new Error("Dataset not found");
      ds.viewers = (ds.viewers || []).filter(
        (u) => String(u) !== String(targetUserId),
      );
      await writeFile(
        getDatasetDbPath(),
        JSON.stringify({ meta, datasets }, null, 2),
      );
    });
    return await FileSystemService.findOneDataset(datasetId);
  },

  addEditor: async (datasetId, targetUserId, actingUser) => {
    // only owner can modify ACL
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId) {
      throw new Error("Unauthorized to modify ACL");
    }

    // ensure target user exists and has admin/editor role
    const usersPath = config.helpers.getUsersPath();
    const usersRaw = JSON.parse(await fs.promises.readFile(usersPath, "utf8"));
    const target = Object.values(usersRaw.users || {}).find(
      (u) => String(u.id) === String(targetUserId),
    );
    if (!target) throw new Error("Target user not found in users DB");
    const targetRoles = target.roles || [];
    if (!(targetRoles.includes("admin") || targetRoles.includes("editor"))) {
      throw new Error(
        "Target user does not have admin/editor role and cannot be made editor",
      );
    }

    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getDatasetDbPath()));
      const { meta = {}, datasets = {} } = raw;
      const ds = datasets[datasetId];
      if (!ds) throw new Error("Dataset not found");
      ds.editors = ds.editors || [];
      const uid = String(targetUserId);
      if (!ds.editors.map(String).includes(uid)) ds.editors.push(uid);
      await writeFile(
        getDatasetDbPath(),
        JSON.stringify({ meta, datasets }, null, 2),
      );
    });

    return await FileSystemService.findOneDataset(datasetId);
  },

  removeEditor: async (datasetId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId) {
      throw new Error("Unauthorized to modify ACL");
    }
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getDatasetDbPath()));
      const { meta = {}, datasets = {} } = raw;
      const ds = datasets[datasetId];
      if (!ds) throw new Error("Dataset not found");
      ds.editors = (ds.editors || []).filter(
        (u) => String(u) !== String(targetUserId),
      );
      await writeFile(
        getDatasetDbPath(),
        JSON.stringify({ meta, datasets }, null, 2),
      );
    });
    return await FileSystemService.findOneDataset(datasetId);
  },

  setVisibility: async (datasetId, visibility, actingUser) => {
    if (!["private", "public"].includes(visibility))
      throw new Error("Invalid visibility");
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    // only owner can change visibility
    if (String(dataset.userId) !== actingId) {
      throw new Error("Unauthorized to modify visibility");
    }
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getDatasetDbPath()));
      const { meta = {}, datasets = {} } = raw;
      const ds = datasets[datasetId];
      if (!ds) throw new Error("Dataset not found");
      ds.visibility = visibility;
      await writeFile(
        getDatasetDbPath(),
        JSON.stringify({ meta, datasets }, null, 2),
      );
    });
    return await FileSystemService.findOneDataset(datasetId);
  },

  // Table ACL modifiers (only dataset owner can modify)
  addTableViewer: async (datasetId, tableId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId)
      throw new Error("Unauthorized to modify ACL");
    const usersPath = config.helpers.getUsersPath();
    const usersRaw = JSON.parse(await fs.promises.readFile(usersPath, "utf8"));
    const target = Object.values(usersRaw.users || {}).find(
      (u) => String(u.id) === String(targetUserId),
    );
    if (!target) throw new Error("Target user not found in users DB");

    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getTablesDbPath()));
      const { meta = {}, tables = {} } = raw;
      const tbl = tables[tableId];
      if (!tbl) throw new Error("Table not found");
      tbl.viewers = tbl.viewers || [];
      const uid = String(targetUserId);
      if (!tbl.viewers.map(String).includes(uid)) tbl.viewers.push(uid);
      // Ensure private when viewers are explicitly set
      if (tbl.visibility === null || tbl.visibility === undefined)
        tbl.visibility = "private";
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
    });
    return await FileSystemService.findOneTable(datasetId, tableId);
  },

  removeTableViewer: async (datasetId, tableId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId)
      throw new Error("Unauthorized to modify ACL");
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getTablesDbPath()));
      const { meta = {}, tables = {} } = raw;
      const tbl = tables[tableId];
      if (!tbl) throw new Error("Table not found");
      tbl.viewers = (tbl.viewers || []).filter(
        (u) => String(u) !== String(targetUserId),
      );
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
    });
    return await FileSystemService.findOneTable(datasetId, tableId);
  },

  addTableEditor: async (datasetId, tableId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId)
      throw new Error("Unauthorized to modify ACL");
    const usersPath = config.helpers.getUsersPath();
    const usersRaw = JSON.parse(await fs.promises.readFile(usersPath, "utf8"));
    const target = Object.values(usersRaw.users || {}).find(
      (u) => String(u.id) === String(targetUserId),
    );
    if (!target) throw new Error("Target user not found in users DB");
    const targetRoles = target.roles || [];
    if (!(targetRoles.includes("admin") || targetRoles.includes("editor")))
      throw new Error(
        "Target user does not have admin/editor role and cannot be made table editor",
      );

    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getTablesDbPath()));
      const { meta = {}, tables = {} } = raw;
      const tbl = tables[tableId];
      if (!tbl) throw new Error("Table not found");
      tbl.editors = tbl.editors || [];
      const uid = String(targetUserId);
      if (!tbl.editors.map(String).includes(uid)) tbl.editors.push(uid);
      // Ensure private when editors are explicitly set
      if (tbl.visibility === null || tbl.visibility === undefined)
        tbl.visibility = "private";
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
    });
    return await FileSystemService.findOneTable(datasetId, tableId);
  },

  removeTableEditor: async (datasetId, tableId, targetUserId, actingUser) => {
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId)
      throw new Error("Unauthorized to modify ACL");
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getTablesDbPath()));
      const { meta = {}, tables = {} } = raw;
      const tbl = tables[tableId];
      if (!tbl) throw new Error("Table not found");
      tbl.editors = (tbl.editors || []).filter(
        (u) => String(u) !== String(targetUserId),
      );
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
    });
    return await FileSystemService.findOneTable(datasetId, tableId);
  },

  setTableVisibility: async (datasetId, tableId, visibility, actingUser) => {
    if (!["private", "public", null].includes(visibility))
      throw new Error(
        "Invalid visibility value (use 'private', 'public', or null to inherit)",
      );
    const dataset = await FileSystemService.findOneDataset(datasetId);
    if (!dataset) throw new Error("Dataset not found");
    const actingId = actingUser && actingUser.id ? String(actingUser.id) : null;
    if (String(dataset.userId) !== actingId)
      throw new Error("Unauthorized to modify visibility");
    // Enforce most-restrictive rule: table cannot be public if dataset is private
    if (visibility === "public" && dataset.visibility === "private")
      throw new Error(
        "Cannot set table to public when dataset is private. The most restrictive permission (dataset private) always wins.",
      );
    await writeQueue.push(async () => {
      const raw = JSON.parse(await readFile(getTablesDbPath()));
      const { meta = {}, tables = {} } = raw;
      const tbl = tables[tableId];
      if (!tbl) throw new Error("Table not found");
      tbl.visibility = visibility;
      // If inheriting from dataset (null), clear explicit viewers/editors
      if (visibility === null) {
        tbl.viewers = [];
        tbl.editors = [];
      }
      await writeFile(
        getTablesDbPath(),
        JSON.stringify({ meta, tables }, null, 2),
      );
    });
    return await FileSystemService.findOneTable(datasetId, tableId);
  },
};

export default FileSystemService;
