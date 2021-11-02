import { readFile, mkdir, writeFile, rm } from 'fs/promises';
import { createReadStream } from 'fs';
import { queue } from 'async';
import unzipper from 'unzipper';
import CONFIG from '../../config';
import ParseService from '../parse/parse.service';

const { DATASETS_DB_PATH, TABLES_DB_PATH, DATASET_FILES_PATH } = CONFIG;

// create queue so that writes to file are not lost
const writeQueue = queue(async (task, completed) => {
  await task();
}, 1);

const FileSystemService = {
  findOneDataset: async (idDataset) => {
    return ParseService.readJsonFileWithCondition({
      path: DATASETS_DB_PATH,
      pattern: 'datasets.*',
      acc: [],
      condition: ({ id }) => id === idDataset
    });
  },
  findAllDatasets: async () => {
    return ParseService.readJsonFile({
      path: DATASETS_DB_PATH,
      pattern: 'datasets.*',
      acc: []
    });
  },
  findAllTablesByDataset: async (idDataset) => {
    return ParseService.readJsonFileWithCondition({
      path: TABLES_DB_PATH,
      pattern: 'tables.*',
      acc: [],
      condition: (item) => item.idDataset === idDataset
    });
  },
  findTable: async (idDataset, idTable) => {
    const table = await ParseService.readJsonFileWithCondition({
      path: TABLES_DB_PATH,
      pattern: 'tables.*',
      acc: [],
      condition: (item) => item.id === idTable,
      stopAtFirst: true
    });
    const { columns, rows } = JSON.parse(await readFile(`${DATASET_FILES_PATH}/${idDataset}/${idTable}.json`));
    return {
      table,
      columns,
      rows
    }
  },
  findTablesByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFileWithCondition({
      path: TABLES_DB_PATH,
      pattern: 'tables.*',
      condition: (obj) => { console.log(obj); return regex.test(obj.name.toLowerCase()); }
    });
  },
  findDatasetsByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFileWithCondition({
      path: DATASETS_DB_PATH, 
      pattern: 'datasets.*',
      condition: (obj) => regex.test(obj.name.toLowerCase())
    });
  },
  addDataset: async (filePath, datasetName) => {
    let newDatasets = {}
    let newTables = {}
    
    await writeQueue.push(async () => {
      // read db datasets
      const { meta: metaDatasets, datasets } = JSON.parse(await readFile(DATASETS_DB_PATH))

      metaDatasets.lastIndex += 1;
      const datasetFolderPath = `${DATASET_FILES_PATH}/${metaDatasets.lastIndex}`
      // create dataset folder
      await mkdir(datasetFolderPath, { recursive: true })
      // read tables datasets
      const { meta: metaTables, tables } = JSON.parse(await readFile(TABLES_DB_PATH))

      const zip = createReadStream(filePath).pipe(unzipper.Parse({ forceStream: true }))
      let nFiles = 0;

      // unzip and write each file
      for await (const entry of zip) {
        const { path, type } = entry;

        const tableName = path.split('.')[0] || 'Unnamend';

        if (type === 'File') {
          metaTables.lastIndex += 1;
          nFiles += 1;
          // transform to app format and write to file
          const data = await ParseService.parse(entry);
          await writeFile(`${datasetFolderPath}/${metaTables.lastIndex}.json`, JSON.stringify(data))

          newTables[`${metaTables.lastIndex}`] = {
            id: `${metaTables.lastIndex}`,
            idDataset: `${metaDatasets.lastIndex}`,
            name: tableName,
            nCols: Object.keys(data.columns).length,
            nRows: Object.keys(data.rows).length,
            nCells: data.nCells,
            nCellsReconciliated: data.nCellsReconciliated,
            lastModifiedDate: new Date().toISOString()
          }           
        } else {
          entry.autodrain();
        }
      }

      // add dataset entry
      newDatasets[`${metaDatasets.lastIndex}`] = {
        id: `${metaDatasets.lastIndex}`,
        name: datasetName,
        nTables: nFiles,
        lastModifiedDate: new Date().toISOString()
      }
      // add dataset entry
      await writeFile(DATASETS_DB_PATH, JSON.stringify({ meta: metaDatasets, datasets: {...datasets, ...newDatasets} }, null, 2));
      // add table entries
      await writeFile(TABLES_DB_PATH, JSON.stringify({ meta: metaTables, tables: {...tables, ...newTables} }, null, 2));
      // delete temp file
      await rm(filePath)
      
    });
    return { datasets: newDatasets, tables: newTables }
  },
  addTable: async (datasetId) => {
    // parse directly to app format and save it (no more distinction from raw and annotated)
  },
  updateTable: async ({ tableInstance, columns: columnsRaw, rows: rowsRaw }) => {
    const { id: tableId, idDataset: datasetId, name: tableName, nCells, nCellsReconciliated } = tableInstance
    const { byId: columns, allIds: allIdsCols } = columnsRaw;
    const { byId: rows, allIds: allIdsRows } = rowsRaw;

    const pathToTable = `${DATASET_FILES_PATH}/${datasetId}/${tableId}`

    let newTable = {}

    await writeQueue.push(async () => {
      const { meta, tables } = JSON.parse(await readFile(TABLES_DB_PATH))
      newTable = {
        ...tables[tableId],
        name: tableName,
        nRows: allIdsRows.length,
        nCols: allIdsCols.length,
        nCells,
        nCellsReconciliated,
        lastModifiedDate: new Date().toISOString()
      }

      // update table entry
      tables[tableId] = {
        ...newTable
      }
      // write updated db
      await writeFile(`${TABLES_DB_PATH}`, JSON.stringify({ meta, tables }, null, 2))
      // write updated table
      await writeFile(`${pathToTable}.json`, JSON.stringify({ columns, rows }))
    })

    return newTable;
  }
};

export default FileSystemService;
