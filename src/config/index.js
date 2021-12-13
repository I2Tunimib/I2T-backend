import CONFIG from '../../config';
import dotenv from 'dotenv';
import { readdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { log } from '../utils/log';
const env = dotenv.config();

if (process.env.ENV === 'DEV' && env.error) {
  throw new Error("⚠️  Couldn't find '.env' file  ⚠️");
}
if (!CONFIG.datasetFilesPath) {
  throw new Error("⚠️  You must provide a path to the dataset files in config.js ⚠️");
}
if (!CONFIG.datasetDbPath) {
  throw new Error("⚠️  You must provide a path to the dataset db in config.js ⚠️");
}
if (!CONFIG.tablesDbPath) {
  throw new Error("⚠️  You must provide a path to the tables db in config.js ⚠️");
}

/**
 * Load extenders services in memory
 */
const loadExtenders = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/extenders`;

  const extenders = readdirSync(basePath).filter((extender) => !services.exclude.extenders.includes(extender));

  return extenders.reduce(async (acc, serviceKey) => {
    const servicePath = `${basePath}/${serviceKey}`
      
    const { default: info } = await import(`file:///${servicePath}/index.js`);
    const { default: requestTransformer } = await import(`file:///${servicePath}/requestTransformer.js`);
    const { default: responseTransformer } = await import(`file:///${servicePath}/responseTransformer.js`);

    (await acc)[serviceKey] = {
      info,
      requestTransformer,
      responseTransformer
    }
    return acc;
  }, {});
}

/**
 * Load reconciliators services in memory
 */
const loadReconciliators = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/reconciliators`;

  const reconciliators = readdirSync(basePath).filter((reconciliator) => !services.exclude.reconciliators.includes(reconciliator));

  return reconciliators.reduce(async (acc, serviceKey) => {
    const servicePath = `${basePath}/${serviceKey}`
      
    const { default: info } = await import(`file:///${servicePath}/index.js`);
    const { default: requestTransformer } = await import(`file:///${servicePath}/requestTransformer.js`);
    const { default: responseTransformer } = await import(`file:///${servicePath}/responseTransformer.js`);

    (await acc)[serviceKey] = {
      info,
      requestTransformer,
      responseTransformer
    }
    return acc;
  }, {});
}

/**
 * Load helper functions in memory
 */
const loadHelperFunctions = async () => {
  const { datasetDbPath, datasetFilesPath, tablesDbPath, tmpPath } = CONFIG;
  return {
    getDatasetFilesPath: () => `${process.env.PWD}${datasetFilesPath}`,
    getDatasetDbPath: () => `${process.env.PWD}${datasetDbPath}`,
    getTablesDbPath: () => `${process.env.PWD}${tablesDbPath}`,
    getTmpPath: () => `${process.env.PWD}${tmpPath}`
  }
}

/**
 * Load initial configuration
 */
const loadConfig = async () => {
  const reconciliators = await loadReconciliators();
  const extenders = await loadExtenders();
  const helpers = await loadHelperFunctions();

  if (!existsSync(helpers.getTablesDbPath())) {
    log('db', 'Create tables DB')
    await writeFile(helpers.getTablesDbPath(), JSON.stringify({ meta: { lastIndex: -1 }, tables: {} }), null, 2)
  }
  
  if (!existsSync(helpers.getDatasetDbPath())) {
    log('db', 'Create dataset DB')
    await writeFile(helpers.getDatasetDbPath(), JSON.stringify({ meta: { lastIndex: -1 }, datasets: {}}), null, 2)
  }
  

  return {
    ENV: process.env.ENV || 'dev',
    PORT: process.env.PORT || '3002',
    MANTIS: process.env.MANTIS,
    MANTIS_AUTH_TOKEN: process.env.MANTIS_AUTH_TOKEN,
    reconciliators,
    extenders,
    helpers,
    mantisObjs: { 
      cronsMap: {}
    }
  }
}


const config = await loadConfig();

export default config;


