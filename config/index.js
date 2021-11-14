import CONFIG from '../config';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
const env = dotenv.config();

if (process.env.ENV === 'DEV' && env.error) {
  throw new Error("⚠️  Couldn't find '.env' file  ⚠️");
}
if (!CONFIG.DATASET_FILES_PATH) {
  throw new Error("⚠️  You must provide a path to the dataset files in config.js ⚠️");
}
if (!CONFIG.DATASETS_DB_PATH) {
  throw new Error("⚠️  You must provide a path to the dataset db in config.js ⚠️");
}
if (!CONFIG.TABLES_DB_PATH) {
  throw new Error("⚠️  You must provide a path to the tables db in config.js ⚠️");
}

const loadExtenders = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}${services.path}/extenders`;

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

const loadReconciliators = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}${services.path}/reconciliators`;

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

const loadHelperFunctions = async () => {
  const { DATASETS_DB_PATH, DATASET_FILES_PATH, TABLES_DB_PATH } = CONFIG;
  console.log(CONFIG);
  return {
    getDatasetFilesPath: () => `${process.env.PWD}${DATASET_FILES_PATH}`,
    getDatasetDbPath: () => `${process.env.PWD}${DATASETS_DB_PATH}`,
    getTablesDbPath: () => `${process.env.PWD}${TABLES_DB_PATH}`
  }
}


const loadConfig = async () => {
  const reconciliators = await loadReconciliators();
  const extenders = await loadExtenders();
  const helpers = await loadHelperFunctions();

  return {
    ENV: process.env.ENV || 'dev',
    PORT: process.env.PORT || '3002',
    reconciliators,
    extenders,
    helpers
  }
}


const config = await loadConfig();

export default config;


