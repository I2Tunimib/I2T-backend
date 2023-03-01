import CONFIG from '../../config';
import dotenv from 'dotenv';
import { readdirSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { log } from '../utils/log';
import { safeWriteFileToPath } from '../utils/safeWriteFile';
import chalk from 'chalk';
import { createExtender, createReconciliator, printAvailableServices } from './utils';

const env = dotenv.config();

/**
 * Load extenders services in memory
 */
const loadExtenders = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/extenders`;

  const extenders = readdirSync(basePath).filter((extender) => !services.exclude.extenders.includes(extender));

  return extenders.reduce(async (acc, serviceKey) => {
    const servicePath = `${basePath}/${serviceKey}`

    const { default: schema } = await import(`file:///${servicePath}/index.js`);
    const serviceSchema = createExtender(schema);
    if (!serviceSchema.success) {
      // serviceSchema.error.issues.forEach((issue) => console.log(issue))
      (await acc).errors[serviceKey] = {
        issues: serviceSchema.error.issues
      }
      return acc;
    }

    const { default: requestTransformer } = await import(`file:///${servicePath}/requestTransformer.js`);
    const { default: responseTransformer } = await import(`file:///${servicePath}/responseTransformer.js`);

    (await acc).available[serviceKey] = {
      info: serviceSchema.data,
      requestTransformer,
      responseTransformer
    }
    return acc;
  }, { available: {}, errors: {} });
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

    const { default: schema } = await import(`file:///${servicePath}/index.js`);
    const serviceSchema = createReconciliator(schema);

    if (!serviceSchema.success) {
      (await acc).errors[serviceKey] = {
        issues: serviceSchema.error.issues
      }
      return acc;
    }

    const { default: requestTransformer } = await import(`file:///${servicePath}/requestTransformer.js`);
    const { default: responseTransformer } = await import(`file:///${servicePath}/responseTransformer.js`);

    (await acc).available[serviceKey] = {
      info: serviceSchema.data,
      requestTransformer,
      responseTransformer
    }
    return acc;
  }, { available: {}, errors: {} });
}

/**
 * Load helper functions in memory
 */
const loadHelperFunctions = async () => {
  const { datasetDbPath, datasetFilesPath, tablesDbPath, tmpPath, usersPath } = CONFIG;
  return {
    getDatasetFilesPath: () => `${process.env.PWD}${datasetFilesPath}`,
    getDatasetDbPath: () => `${process.env.PWD}${datasetDbPath}`,
    getTablesDbPath: () => `${process.env.PWD}${tablesDbPath}`,
    getTmpPath: () => `${process.env.PWD}${tmpPath}`,
    getUsersPath: () => `${process.env.PWD}${usersPath}`
  }
}

/**
 * Load initial configuration
 */
const loadConfig = async () => {
  console.log(chalk.bold('\nInitializing configuration...\n'));

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

  const reconciliators = await loadReconciliators();
  const extenders = await loadExtenders();

  printAvailableServices('Reconciliators', reconciliators);
  printAvailableServices('Extenders', extenders);


  const helpers = await loadHelperFunctions();

  if (!existsSync(helpers.getTmpPath())) {
    await mkdir(helpers.getTmpPath());
  }

  if (!existsSync(helpers.getTablesDbPath())) {
    log('db', 'Create tables DB')
    await safeWriteFileToPath(helpers.getTablesDbPath(), JSON.stringify({ meta: { lastIndex: -1 }, tables: {} }, null, 2))
  }

  if (!existsSync(helpers.getDatasetDbPath())) {
    log('db', 'Create dataset DB')
    await safeWriteFileToPath(helpers.getDatasetDbPath(), JSON.stringify({ meta: { lastIndex: -1 }, datasets: {} }, null, 2))
  }

  if (!existsSync(helpers.getUsersPath())) {
    log('db', 'Create users DB')
    await safeWriteFileToPath(helpers.getUsersPath(), JSON.stringify({ meta: { lastIndex: -1 }, users: {} }, null, 2))
  }


  return {
    ENV: process.env.ENV || 'dev',
    PORT: process.env.PORT || '3003',
    MANTIS: process.env.MANTIS,
    MANTIS_AUTH_TOKEN: process.env.MANTIS_AUTH_TOKEN,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    reconciliators: reconciliators.available,
    extenders: extenders.available,
    helpers,
    mantisObjs: {
      cronsMap: {}
    }
  }
}


const config = await loadConfig();

export default config;


