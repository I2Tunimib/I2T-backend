import CONFIG from "../../config.js";
import dotenv from "dotenv";
import { readdirSync, existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { log } from "../utils/log.js";
import { safeWriteFileToPath } from "../utils/safeWriteFile.js";
const env = dotenv.config();

if (process.env.ENV === "DEV" && env.error) {
  throw new Error("⚠️  Couldn't find '.env' file  ⚠️");
}
if (!CONFIG.datasetFilesPath) {
  throw new Error(
    "⚠️  You must provide a path to the dataset files in config.js ⚠️"
  );
}
if (!CONFIG.datasetDbPath) {
  throw new Error(
    "⚠️  You must provide a path to the dataset db in config.js ⚠️"
  );
}
if (!CONFIG.tablesDbPath) {
  throw new Error(
    "⚠️  You must provide a path to the tables db in config.js ⚠️"
  );
}

/**
 * Load extenders services in memory
 */
const loadExtenders = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/extenders`;

  const extenders = readdirSync(basePath).filter(
    (extender) => !services.exclude?.extenders?.includes(extender)
  );

  return extenders.reduce(async (acc, serviceKey) => {
    const servicePath = `${basePath}/${serviceKey}`;

    const { default: info } = await import(`file:///${servicePath}/index.js`);
    const { default: requestTransformer } = await import(
      `file:///${servicePath}/requestTransformer.js`
    );
    const { default: responseTransformer } = await import(
      `file:///${servicePath}/responseTransformer.js`
    );

    (await acc)[serviceKey] = {
      info,
      requestTransformer,
      responseTransformer,
    };
    return acc;
  }, {});
};

/**
 * Load reconcilers services in memory
 */
const loadReconcilers = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/reconcilers`;

  const reconcilers = readdirSync(basePath).filter(
    (reconciler) => !services.exclude?.reconcilers?.includes(reconciler)
  );

  return reconcilers.reduce(async (acc, serviceKey) => {
    //TODO: non fare crashare se mancano i file
    const servicePath = `${basePath}/${serviceKey}`;

    const { default: info } = await import(`file:///${servicePath}/index.js`);
    const { default: requestTransformer } = await import(
      `file:///${servicePath}/requestTransformer.js`
    );
    const { default: responseTransformer } = await import(
      `file:///${servicePath}/responseTransformer.js`
    );

    (await acc)[serviceKey] = {
      info,
      requestTransformer,
      responseTransformer,
    };
    return acc;
  }, {});
};


/**
 * Load modifiers services in memory
 */
const loadModifiers = async () => {
  const { services } = CONFIG;

  const basePath = `${process.env.PWD}/src${services.path}/modifiers`;

  const modifiers = readdirSync(basePath).filter(
      (modifier) => !services.exclude?.modifiers?.includes(modifier)
  );

  return modifiers.reduce(async (acc, serviceKey) => {
    const servicePath = `${basePath}/${serviceKey}`;

    const { default: info } = await import(`file:///${servicePath}/index.js`);
    const { default: requestTransformer } = await import(
        `file:///${servicePath}/requestTransformer.js`
        );
    const { default: responseTransformer } = await import(
        `file:///${servicePath}/responseTransformer.js`
        );

    (await acc)[serviceKey] = {
      info,
      requestTransformer,
      responseTransformer,
    };
    return acc;
  }, {});
};


/**
 * Load helper functions in memory
 */
const loadHelperFunctions = async () => {
  const { datasetDbPath, datasetFilesPath, tablesDbPath, tmpPath, usersPath } =
    CONFIG;
  return {
    getDatasetFilesPath: () => `${process.env.PWD}${datasetFilesPath}`,
    getDatasetDbPath: () => `${process.env.PWD}${datasetDbPath}`,
    getTablesDbPath: () => `${process.env.PWD}${tablesDbPath}`,
    getTmpPath: () => `${process.env.PWD}${tmpPath}`,
    getUsersPath: () => `${process.env.PWD}${usersPath}`,
  };
};

/**
 * Load initial configuration
 */
const loadConfig = async () => {
  const reconcilers = await loadReconcilers();
  const extenders = await loadExtenders();
  const modifiers = await loadModifiers();
  const helpers = await loadHelperFunctions();

  if (!existsSync(helpers.getTmpPath())) {
    await mkdir(helpers.getTmpPath());
  }

  if (!existsSync(helpers.getTablesDbPath())) {
    log("db", "Create tables DB");
    await safeWriteFileToPath(
      helpers.getTablesDbPath(),
      JSON.stringify({ meta: { lastIndex: -1 }, tables: {} }, null, 2)
    );
  }

  if (!existsSync(helpers.getDatasetDbPath())) {
    log("db", "Create dataset DB");
    await safeWriteFileToPath(
      helpers.getDatasetDbPath(),
      JSON.stringify({ meta: { lastIndex: -1 }, datasets: {} }, null, 2)
    );
  }

  if (!existsSync(helpers.getUsersPath())) {
    log("db", "Create users DB");
    const defaultUser = {
      id: 0,
      username: "test",
      email: "test",
      password: "test",
      createdAt: new Date().toISOString(),
    };

    const initialUsersDb = {
      meta: { lastIndex: 0 },
      users: {
        0: defaultUser,
      },
    };

    await safeWriteFileToPath(
      helpers.getUsersPath(),
      JSON.stringify(initialUsersDb, null, 2)
    );
    log(
      "db",
      "Created users DB with default test user (username: test, password: test)"
    );
  } else {
    // Check if default test user exists, if not add it
    try {
      const usersData = JSON.parse(
        await import("fs").then((fs) =>
          fs.promises.readFile(helpers.getUsersPath(), "utf8")
        )
      );
      const hasTestUser = Object.values(usersData.users || {}).some(
        (user) => user.username === "test" && user.password === "test"
      );

      if (!hasTestUser) {
        const { meta, users } = usersData;
        const newId = (meta.lastIndex || -1) + 1;

        const defaultUser = {
          id: newId,
          username: "test",
          email: "test",
          password: "test",
          createdAt: new Date().toISOString(),
        };

        users[newId] = defaultUser;
        const updatedUsersDb = {
          meta: { lastIndex: newId },
          users,
        };

        await safeWriteFileToPath(
          helpers.getUsersPath(),
          JSON.stringify(updatedUsersDb, null, 2)
        );
        log(
          "db",
          "Added default test user to existing users DB (username: test, password: test)"
        );
      }
    } catch (err) {
      log("db", "Error checking for default user: " + err.message);
    }
  }

  return {
    ENV: process.env.ENV || "dev",
    PORT: process.env.PORT || "3003",
    MANTIS: process.env.MANTIS,
    MANTIS_AUTH_TOKEN: process.env.MANTIS_AUTH_TOKEN,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    reconcilers,
    extenders,
    modifiers,
    helpers,
    mantisObjs: {
      cronsMap: {},
    },
  };
};

const config = await loadConfig();

export default config;
