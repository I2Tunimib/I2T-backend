import CONFIG from '../config';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
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
  const { datasetDbPath, datasetFilesPath, tablesDbPath } = CONFIG;
  return {
    getDatasetFilesPath: () => `${process.env.PWD}${datasetFilesPath}`,
    getDatasetDbPath: () => `${process.env.PWD}${datasetDbPath}`,
    getTablesDbPath: () => `${process.env.PWD}${tablesDbPath}`
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


