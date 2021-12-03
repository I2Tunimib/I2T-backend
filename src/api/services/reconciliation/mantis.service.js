import FileSystemService from '../datasets/datasets.service';
import ExportService from '../export/export.service';
import { nanoid } from 'nanoid';
import { writeFile, readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { queue } from 'async';
import FormData from 'form-data';
import axios from 'axios';
import path from 'path';
import config from '../../../config/index';
import { log } from '../../../utils/log';

const __dirname = path.resolve();

const { 
  MANTIS, 
  MANTIS_AUTH_TOKEN,
  mantisObjs: {
    cronsMap
  },
  helpers: {
    getDatasetDbPath, 
    getTablesDbPath,
    getDatasetFilesPath
  }
} = config;

// create queue so that writes to file are not lost or are conflicting
const writeQueue = queue(async (task, completed) => {
  await task();
}, 1);

const handleAnnotationCompletion = async ({ mantisDatasetId, mantisTableId, localDatasetId, localTableId }) => {
  // get table data
  const table = await MantisService.getTable(mantisDatasetId, mantisTableId);
  // process data to compute number of reconciliated cells
  const processedTable = await FileSystemService.computeStats(table);

  let data;
  // save table
  await writeQueue.push(async () => {
    const { 
      table: {
        status,
        nCells,
        nCellsReconciliated
      },
      columns,
      rows
    } = processedTable;
    // update db entry
    const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()))
    tables[localTableId] = {
      ...tables[localTableId],
      mantisStatus: status,
      nCells,
      nCellsReconciliated,
      lastModifiedDate: new Date().toISOString()
    }

    await writeFile(getTablesDbPath(), JSON.stringify({ meta, tables }, null, 2));
    // update table data
    await writeFile(`${getDatasetFilesPath()}/${localDatasetId}/${localTableId}.json`, JSON.stringify({ columns, rows })); 

    data = {
      table: tables[localTableId],
      columns,
      rows
    }
  })

  return data;
}

const clearCron = (cronId) => {
  const cron = cronsMap[cronId];
  clearInterval(cron);
  delete cronsMap[cronId];
  log('mantis', `Finished tracking for ${cronId}`)
}

const startCron = ({ localTableId, localDatasetId, mantisDatasetId, mantisTableId, io }) => {
  log('mantis', `Started tracking for ${mantisDatasetId}_${mantisTableId}`)
  // check every 30 seconds
  const intervalId = setInterval(async () => {
    const result = await MantisService.getTableAnnotationStatus(mantisDatasetId, mantisTableId);
    // if annotation is done add to queue to stop the cronjob
    if (result && result.status === 'DONE') {
      // remove cron
      clearCron(`${mantisDatasetId}_${mantisTableId}`);
      // process and save annotated table
      const annotatedTable = await handleAnnotationCompletion({
        localTableId,
        localDatasetId,
        mantisDatasetId,
        mantisTableId
      });
      // emit to client annotated table
      io.emit('done', annotatedTable);
    }
  }, 30000);
  cronsMap[`${mantisDatasetId}_${mantisTableId}`] = intervalId;
}

const MantisService = {
  getAllDataset: async () => {
    const result = await axios.get(`${MANTIS}/dataset`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data
  },
  getTablesByDataset: async (mantisDatasetId) => {
    const result = await axios.get(`${MANTIS}/dataset/${mantisDatasetId}/table`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  getTable: async (mantisDatasetId, mantisTableId) => {
    const result = await axios.get(`${MANTIS}/dataset/${mantisDatasetId}/table/${mantisTableId}`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  getDatasetAnnotationStatus: async (mantisDatasetId) => {
    const result = await axios.get(`${MANTIS}/dataset/${mantisDatasetId}/annotation`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  getTableAnnotationStatus: async (mantisDatasetId, mantisTableId) => {
    const result = await axios.get(`${MANTIS}/dataset/${mantisDatasetId}/table/${mantisTableId}/annotation`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  deleteDataset: async (mantisDatasetId) => {
    log('mantis', `Delete dataset [${mantisDatasetId}]`)
    const result = await axios.delete(`${MANTIS}/dataset/${mantisDatasetId}`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  deleteTable: async (mantisDatasetId, mantisTableId) => {
    log('mantis', `Delete table [${mantisTableId}] from [${mantisDatasetId}]`)
    const result = await axios.delete(`${MANTIS}/dataset/${mantisDatasetId}/table/${mantisTableId}`, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  },
  checkPendingTable: async (io) => {
    // if there are table pending the server stopped while Mantis 
    // annotation processes were undergoing
    const pendingTables = await FileSystemService.findTables((table) => table.mantisStatus === 'PENDING');
    log('mantis', `There are ${pendingTables.length} pending tables`)

    for (const table of pendingTables) {
      const { id: localTableId, idDataset: localDatasetId, mantisId: mantisTableId } = table;
      const { mantisId: mantisDatasetId } = await FileSystemService.findOneDataset(localDatasetId);
  
      const result = await MantisService.getTableAnnotationStatus(mantisDatasetId, mantisTableId);
  
      if (result) {
        if (result.status === 'DONE') {
          const annotatedTable = await handleAnnotationCompletion({
            localTableId,
            localDatasetId,
            mantisDatasetId,
            mantisTableId
          });
          // emit to client annotated table
          io.emit('done', annotatedTable);
        } else {
          startCron({             
            localTableId,
            localDatasetId,
            mantisDatasetId,
            mantisTableId,
            io
          })
        }
      }
    }
  },
  trackAnnotationStatus: async ({
    localTableId,
    ...rest
  }) => {
    // start cron to check annotation status every 30 seconds
    startCron({ localTableId, ...rest });  
    // update status to pending
    const { meta, tables } = JSON.parse(await readFile(getTablesDbPath()))
    tables[localTableId] = {
      ...tables[localTableId],
      mantisStatus: 'PENDING'
    }
    await writeFile(getTablesDbPath(), JSON.stringify({ meta, tables }, null, 2));
  },
  createTable: async (localDatasetId, localTableId) => {
    // create temporary id as file name
    const tableTmpId = nanoid();
    let data;
    await writeQueue.push(async () => {
      try {
        const localTable = await FileSystemService.findOneTable(localDatasetId, localTableId);
        const localDataset = await FileSystemService.findOneDataset(localDatasetId);
  
        if (!localTable) {
          throw new Error('Table not found');
        }

        const { mantisId, name } = localTable;

        if (mantisId === undefined) {

          if (!localDataset) {
            throw new Error('Dataset not found');
          }

          // convert to csv format
          const table = await FileSystemService.findTable(localDatasetId, localTableId)
          await writeFile(`./tmp/${tableTmpId}.csv`, await ExportService.csv(table))

          // zip file to upload to mantis
          const inputPath = path.resolve(__dirname, 'tmp', `${tableTmpId}.csv`);
          const outputPath = path.resolve(__dirname, 'tmp', `${tableTmpId}.zip`)
          await FileSystemService.zip(inputPath, outputPath);
          // create a unique id as dataset name so I can upload dataset from the UI with the same name
          // but will be unique on mantis.
          const datasetName = nanoid();

          // build formdata to upload zip
          const formData = new FormData();
          formData.append('file', createReadStream(outputPath));
          formData.append('datasetName', datasetName);

          if (localDataset.mantisId === undefined) {
            // create dataset with only the current table
            const result = await axios.post(`${MANTIS}/dataset`, formData, {
              timeout: 5000,
              headers: {
                ...formData.getHeaders(),
                token: MANTIS_AUTH_TOKEN
              }
            })
            log('mantis', `Created dataset ${datasetName}`)

            const mantisDataset = result.data;

            // set mantisId for the dataset
            const { meta: metaDatasets, datasets } = JSON.parse(await readFile(getDatasetDbPath()))
            datasets[localDatasetId] = {
              ...datasets[localDatasetId],
              mantisDatasetName: datasetName,
              mantisId: mantisDataset.id
            }
            // update datasets
            await writeFile(getDatasetDbPath(), JSON.stringify({ meta: metaDatasets, datasets }, null, 2));
            // set mantisId for table
            const mantisTables = await MantisService.getTablesByDataset(mantisDataset.id);
            // there should always be a single table
            if (mantisTables.length > 1) {
              throw new Error('Found multiple tables in mantis dataset')
            }

            const { meta: metaTables, tables } = JSON.parse(await readFile(getTablesDbPath()))
            tables[localTableId] = {
              ...tables[localTableId],
              mantisId: mantisTables[0].id
            }
            // update tables
            await writeFile(getTablesDbPath(), JSON.stringify({ meta: metaTables, tables }, null, 2));
            data = {
              mantisDatasetId: mantisDataset.id,
              mantisTableId: mantisTables[0].id
            }
            return;
          }

          // upload table to existing dataset
          const result = await axios.post(`${MANTIS}/dataset/${localDataset.mantisId}/table`, formData, {
            timeout: 5000,
            headers: {
              ...formData.getHeaders(),
              token: MANTIS_AUTH_TOKEN
            }
          })
          log('mantis', `Created table ${tableTmpId}`)
          const mantisTables = result.data;

          const { meta: metaTables, tables } = JSON.parse(await readFile(getTablesDbPath()))
            tables[localTableId] = {
              ...tables[localTableId],
              mantisId: mantisTables[0].id
            }
          // update tables
          await writeFile(getTablesDbPath(), JSON.stringify({ meta: metaTables, tables }, null, 2));
          data = {
            mantisDatasetId: localDataset.mantisId,
            mantisTableId: mantisTables[0].id
          }
          await FileSystemService.deleteFiles(new RegExp(tableTmpId))
          return;
        }

        data = {
          mantisDatasetId: localDataset.mantisId,
          mantisTableId: localTable.mantisId
        }
      } catch (err) {
        console.log(err);
        throw new err;
      }
    })
    return data;
  },
  annotate: async (mantisDatasetId, mantisTableId) => {
    const result = await axios.post(`${MANTIS}/dataset/${mantisDatasetId}/table/${mantisTableId}/annotation`, {}, {
      headers: {
        token: MANTIS_AUTH_TOKEN
      }
    });
    return result.data;
  }
}

export default MantisService;
