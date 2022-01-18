import { readFile, mkdir, writeFile, rm, readdir } from 'fs/promises';
import { createReadStream, existsSync, lstatSync } from 'fs';
import { queue } from 'async';
import unzipper from 'unzipper';
import { spawn } from 'child_process';
import ParseService from '../parse/parse.service';
import MantisService from '../reconciliation/mantis.service';
import config from '../../../config/index';
import path from "path"
import { KG_INFO } from '../../../utils/constants'
import { log } from '../../../utils/log';
import ParseW3C from '../parse/parse-w3c.service';
import { PassThrough } from 'stream';
const __dirname = path.resolve();

const { getDatasetDbPath, getTablesDbPath, getDatasetFilesPath, getTmpPath } = config.helpers;

const COLLECTION_DATASETS_MAP = {
  name: {
    label: 'Name',
    type: 'link', //'date' | 'percentage' | 'tag' | 'link',    
    props: {
      url: '/datasets/:id/tables'
    }
  },
  description: {
    label: 'Description'
  },
  nTables: {
    label: 'N. Tables'
  },
  mentions: {
    label: 'N. Mentions'
  },
  lastModifiedDate: {
    label: 'Last Modified',
    type: 'date'
  }
}

const COLLECTION_TABLES_MAP = {
  name: {
    label: 'Name',
    type: 'link',
    props: {
      url: '/datasets/:idDataset/tables/:id',
      queryParams: '?view=table'
    }
  },
  nCols: {
    label: 'N. Cols'
  },
  nRows: {
    label: 'N. Rows'
  },
  completion: {
    label: 'Completion',
    type: 'percentage'
  },
  lastModifiedDate: {
    label: 'Last Modified',
    type: 'date'
  }
}



// create queue so that writes to file are not lost
const writeQueue = queue(async (task, completed) => {
  await task();
}, 1);

const FileSystemService = {
  zip: async (inputFile, outputFile, timeout = (1000 * 60 * 5)) => {
    return new Promise((resolve, reject) => {

      const subprocess = spawn('zip', ['-j', outputFile, inputFile], {
        shell: false,
        stdio: 'ignore',
        cwd: __dirname,
      });

      //failed to spawn process
      subprocess.on('error', reject);

      const t = setTimeout(() => {
        subprocess.kill();
        reject(new Error('TIMEDOUT'));
      }, timeout);

      //process exited
      subprocess.on('exit', (code, signal) => {
        clearTimeout(t);
        if (code === 0) {
          resolve();
        }
        else {
          reject(code || signal);
        }
      });
    });
  },
  deleteFiles: async (pattern) => {
    const files = await readdir(getTmpPath());
    for (const file of files) {
      if (file.match(pattern)) {
        rm(`${getTmpPath()}/${file}`)
      }
    }
  },
  findOneDataset: async (idDataset) => {
    return ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: 'datasets.*',
      acc: [],
      stopAtFirst: true,
      condition: ({ id }) => id === idDataset
    });
  },
  findAllDatasets: async () => {
    const datasets = await ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: 'datasets.*',
      acc: []
    });
    return {
      meta: COLLECTION_DATASETS_MAP,
      collection: datasets
    }
  },
  findAllTablesByDataset: async (idDataset) => {
    const tables = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: 'tables.*',
      acc: [],
      transformFn: (item) => {
        const { nCells, nCellsReconciliated, ...rest } = item;
        return {
          ...rest,
          completion: {
            total: nCells,
            value: nCellsReconciliated
          }
        }
      },
      condition: (item) => item.idDataset === idDataset
    });
    return {
      meta: COLLECTION_TABLES_MAP,
      collection: tables
    }
  },
  findTables: async (condition) => {
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: 'tables.*',
      acc: [],
      condition
    });
  },
  findTable: async (idDataset, idTable) => {
    const table = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: 'tables.*',
      acc: [],
      condition: (item) => item.idDataset === idDataset && item.id === idTable,
      stopAtFirst: true
    });

    const { columns, rows } = JSON.parse(await readFile(`${getDatasetFilesPath()}/${idDataset}/${idTable}.json`));
    return {
      table,
      columns,
      rows
    }
  },
  findOneTable: async (idDataset, idTable) => {
    const table = await ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: 'tables.*',
      acc: [],
      stopAtFirst: true,
      condition: ({ id, idDataset: currentIdDataset }) => currentIdDataset === idDataset && id === idTable
    });
    return table
  },
  findTablesByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getTablesDbPath(),
      pattern: 'tables.*',
      condition: (obj) => { return regex.test(obj.name.toLowerCase()); }
    });
  },
  findDatasetsByName: async (query) => {
    const regex = new RegExp(query.toLowerCase());
    return ParseService.readJsonFile({
      path: getDatasetDbPath(),
      pattern: 'datasets.*',
      condition: (obj) => regex.test(obj.name.toLowerCase())
    });
  },
  addDataset: async (filePath, datasetName) => {
    let newDatasets = {}
    let newTables = {}

    await writeQueue.push(async () => {
      try {
        // read db datasets
        const { meta: metaDatasets, datasets } = JSON.parse(await readFile(getDatasetDbPath()))

        metaDatasets.lastIndex += 1;
        const datasetFolderPath = `${getDatasetFilesPath()}/${metaDatasets.lastIndex}`
        // create dataset folder
        await mkdir(datasetFolderPath, { recursive: true })
        // read tables datasets
        const { meta: metaTables, tables } = JSON.parse(await readFile(getTablesDbPath()))

        const zip = createReadStream(filePath).pipe(unzipper.Parse({ forceStream: true }))
        let nFiles = 0;

        // unzip and write each file
        for await (const entry of zip) {
          const { path, type } = entry;          

          const tableName = path.split('.')[0] || 'Unnamend';

          if (type === 'File' && path.split('/').length === 1) {
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
        await writeFile(getDatasetDbPath(), JSON.stringify({ meta: metaDatasets, datasets: { ...datasets, ...newDatasets } }, null, 2));
        // add table entries
        await writeFile(getTablesDbPath(), JSON.stringify({ meta: metaTables, tables: { ...tables, ...newTables } }, null, 2));
        // delete temp file
        await rm(filePath)
      } catch (err) {
        console.log(err)
      }


    });
    return { datasets: newDatasets, tables: newTables }
  },
  removeDataset: async (datasetId) => {
    await writeQueue.push(async () => {
      try {
        const { meta: metaDatasets, datasets } = JSON.parse(await readFile(getDatasetDbPath()))
        const { meta: metaTables, tables } = JSON.parse(await readFile(getTablesDbPath()))

        // remove tables
        let nRemoved = 0;
        for (const key in tables) {
          if (tables[key].idDataset === datasetId) {
            delete tables[key]
            nRemoved += 1
          }
        }
        const { mantisId } = datasets[datasetId];

        if (mantisId !== undefined) {
          try {
            await MantisService.deleteDataset(mantisId);
          } catch {
            log('mantis', `Dataset [${mantisId}] not found`)
          }
        }

        // remove dataset
        delete datasets[datasetId];

        // replace db
        await writeFile(getDatasetDbPath(), JSON.stringify({ meta: metaDatasets, datasets }, null, 2));
        // replace db
        await writeFile(getTablesDbPath(), JSON.stringify({ meta: metaTables, tables }, null, 2));

        // remove files
        await rm(`${getDatasetFilesPath()}/${datasetId}`, { recursive: true })
      } catch (err) {
        console.log(err);
      }
    });
  },
  removeTable: async (datasetId, tableId) => {
    await writeQueue.push(async () => {
      const { meta: metaDatasets, datasets } = JSON.parse(await readFile(getDatasetDbPath()))
      const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()))

      if (tables[tableId]) {
        // remove table
        if (tables[tableId].mantisId !== undefined) {
          await MantisService.deleteTable(datasets[datasetId].mantisId, tables[tableId].mantisId);
        }
        delete tables[tableId];

        datasets[datasetId].nTables -= 1;
        datasets[datasetId].lastModifiedDate = new Date().toISOString()

        // replace db
        await writeFile(getDatasetDbPath(), JSON.stringify({ meta: metaDatasets, datasets }, null, 2));
        // replace db
        await writeFile(getTablesDbPath(), JSON.stringify({ meta, tables }, null, 2));

        try {
          // remove files
          await rm(`${getDatasetFilesPath()}/${datasetId}/${tableId}.json`)
        } catch (err) {
          console.log(err);
        }
      }

    });
  },
  addTable: async (idDataset, filePath, tableName) => {
    let newDatasets = {}
    let newTables = {}

    await writeQueue.push(async () => {
      try {
        // read db datasets
        const { meta: metaDatasets, datasets } = JSON.parse(await readFile(getDatasetDbPath()))
        // metaDatasets.lastIndex += 1;
        const datasetFolderPath = `${getDatasetFilesPath()}/${idDataset}`
        // read tables datasets
        const { meta: metaTables, tables } = JSON.parse(await readFile(getTablesDbPath()))

        const zip = createReadStream(filePath).pipe(unzipper.Parse({ forceStream: true }))

        // unzip and write each file
        for await (const entry of zip) {

          const { type } = entry;

          if (type === 'File') {
            metaTables.lastIndex += 1;
            // transform to app format and write to file
            const data = await ParseService.parse(entry);

            await writeFile(`${datasetFolderPath}/${metaTables.lastIndex}.json`, JSON.stringify(data))

            newTables[`${metaTables.lastIndex}`] = {
              id: `${metaTables.lastIndex}`,
              idDataset,
              name: tableName,
              nCols: Object.keys(data.columns).length,
              nRows: Object.keys(data.rows).length,
              nCells: data.nCells,
              nCellsReconciliated: data.nCellsReconciliated,
              lastModifiedDate: new Date().toISOString()
            }

            datasets[idDataset] = {
              ...datasets[idDataset],
              nTables: datasets[idDataset].nTables + 1
            }
          } else {
            entry.autodrain();
          }
        }

        // add dataset entry
        await writeFile(getDatasetDbPath(), JSON.stringify({ meta: metaDatasets, datasets: { ...datasets, ...newDatasets } }, null, 2));
        // add table entries
        await writeFile(getTablesDbPath(), JSON.stringify({ meta: metaTables, tables: { ...tables, ...newTables } }, null, 2));
        // delete temp file
        await rm(filePath)
      } catch (err) {
        console.log(err)
      }


    });
    return newTables
  },
  updateTable: async ({ tableInstance, columns: columnsRaw, rows: rowsRaw }) => {
    const { id: tableId, idDataset: datasetId, name: tableName, nCells, nCellsReconciliated, minMetaScore, maxMetaScore } = tableInstance
    const { byId: columns, allIds: allIdsCols } = columnsRaw;
    const { byId: rows, allIds: allIdsRows } = rowsRaw;

    const pathToTable = `${getDatasetFilesPath()}/${datasetId}/${tableId}`

    let newTable = {}

    await writeQueue.push(async () => {
      const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()))
      newTable = {
        ...tables[tableId],
        name: tableName,
        nRows: allIdsRows.length,
        nCols: allIdsCols.length,
        nCells,
        nCellsReconciliated,
        minMetaScore,
        maxMetaScore,
        lastModifiedDate: new Date().toISOString()
      }

      // update table entry
      tables[tableId] = {
        ...newTable
      }
      // write updated db
      await writeFile(`${getTablesDbPath()}`, JSON.stringify({ meta, tables }, null, 2))
      // write updated table
      await writeFile(`${pathToTable}.json`, JSON.stringify({ columns, rows }))
    })

    return newTable;
  },
  transformMetadata: (metadata) => {
    let lowestScore = 0;
    let highestScore = 0;
    let match = {
      value: false
    };

    const meta = metadata.map((metaItem, index) => {
      const [prefix, id] = metaItem.id.split(':');
      if (metaItem.match) {
        match = {
          value: true,
          reason: 'reconciliator'
        };
      }
      if (index === 0) {
        lowestScore = metaItem.score;
        highestScore = metaItem.score;
      } else {
        lowestScore = metaItem.score < lowestScore ? metaItem.score : lowestScore;
        highestScore = metaItem.score > highestScore ? metaItem.score : highestScore;
      }
      return {
        ...metaItem,
        name: {
          value: metaItem.name,
          uri: `${KG_INFO[prefix].uri}${id}`
        }
      }
    })

    return {
      metadata: meta,
      highestScore,
      lowestScore,
      match
    }
  },
  computeStats: async (tableData) => {
    const { table, columns, rows: rawRows } = tableData;

    let minMetaScore = 0
    let maxMetaScore = 0

    const rows = Object.keys(rawRows).reduce((acc, rowId) => {
      acc[rowId] = {
        ...rawRows[rowId],
        cells: Object.keys(rawRows[rowId].cells).reduce((accCell, colId) => {
          const { lowestScore, highestScore, match, metadata } = FileSystemService.transformMetadata(rawRows[rowId].cells[colId].metadata);
          minMetaScore = lowestScore < minMetaScore ? lowestScore : minMetaScore;
          maxMetaScore = highestScore > maxMetaScore ? highestScore : maxMetaScore;

          accCell[colId] = {
            ...rawRows[rowId].cells[colId],
            annotationMeta: {
              ...(columns[colId].kind === 'entity' && {
                annotated: true
              }),
              match,
              lowestScore,
              highestScore
            },
            metadata
          }
          return accCell;
        }, {})
      }
      return acc;
    }, {});

    ParseW3C.updateColumnsStatus(columns, rows);

    return {
      table: {
        ...table,
        minMetaScore,
        maxMetaScore
      },
      rows,
      columns
    }
  }
};

export default FileSystemService;