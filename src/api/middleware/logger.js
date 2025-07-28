import fs from "fs";
import path from "path";

// Operation types
const OPERATION_TYPES = {
  RECONCILIATION: "RECONCILIATION",
  EXTENSION: "EXTENSION",
  SAVE: "SAVE_TABLE",
  GET_TABLE: "GET_TABLE",
};

// Route patterns
const ROUTE_PATTERNS = {
  SAVE: /^\/api\/dataset\/\d+\/table\/\d+\/?$/,
  RECONCILIATORS: "/api/reconciliators/",
  EXTENDERS: "/api/extenders/",
};

// Raw body capture
const getRawBody = (req) => {
  return new Promise((resolve) => {
    // Skip if body already parsed or method doesn't have body
    if (req.body && Object.keys(req.body).length > 0) {
      return resolve(req.body);
    }

    if (req.method === "GET" || req.method === "OPTIONS") {
      return resolve({});
    }

    // Skip if no content type or not JSON
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return resolve({});
    }

    let data = "";
    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        const parsedData = data.length ? JSON.parse(data) : {};
        // Store raw body for middleware access
        req._rawBody = parsedData;
        resolve(parsedData);
      } catch (e) {
        console.error("Error parsing request body:", e);
        resolve({});
      }
    });
  });
};

export default async (req, res, next) => {
  try {
    // Capture raw body before it's parsed by express.json()
    const rawBody = await getRawBody(req);
    // Store it for later use
    req._rawBody = rawBody;
    await routeLogs(req);
  } catch (error) {
    console.error("Error in logger middleware:", error);
    // Log error but don't block the request
  }
  // Always continue with next middleware
  next();
};

// Modified to use _rawBody if available
async function routeLogs(req) {
  const { method, url } = req;

  // Skip OPTIONS requests
  if (method === "OPTIONS") {
    console.log("OPTIONS request, skipping logging.");
    return;
  }

  // Handle different route types
  if (url.includes(ROUTE_PATTERNS.RECONCILIATORS)) {
    await handleReconciliationRoute(req, url);
  } else if (url.includes(ROUTE_PATTERNS.EXTENDERS)) {
    await handleExtenderRoute(req, url);
  } else if (ROUTE_PATTERNS.SAVE.test(url)) {
    await handleSaveRoute(req, method);
  }
}

async function handleReconciliationRoute(req, url) {
  const requestedReconciliation = extractServiceFromUrl(
    url,
    ROUTE_PATTERNS.RECONCILIATORS,
  );
  const taskInfos = await getTaskInfos(req);

  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    await writeLog(
      datasetId,
      tableId,
      OPERATION_TYPES.RECONCILIATION,
      null,
      {
        columnName,
        service: requestedReconciliation,
      },
      req._rawBody || req.body,
    );
  }
}

async function handleExtenderRoute(req, url) {
  let requestedExtender = extractServiceFromUrl(url, ROUTE_PATTERNS.EXTENDERS);
  if (req.body && req.body.serviceId) {
    requestedExtender += `-${req.body.serviceId}`;
  }
  const taskInfos = await getTaskInfos(req);

  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    await writeLog(
      datasetId,
      tableId,
      OPERATION_TYPES.EXTENSION,
      null,
      {
        columnName,
        service: requestedExtender,
      },
      req._rawBody || req.body,
    );
  }
}

async function handleSaveRoute(req, method) {
  const taskInfos = await getTaskInfos(req);

  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, deletedCols] = taskInfos;

    if (method === "PUT") {
      await writeLog(datasetId, tableId, OPERATION_TYPES.SAVE, deletedCols);
    }
  } else if (taskInfos && taskInfos.length === 2) {
    const [tableId, datasetId] = taskInfos;
    if (method === "PUT") {
      await writeLog(datasetId, tableId, OPERATION_TYPES.SAVE);
    }
    if (method === "GET") {
      await writeLog(datasetId, tableId, OPERATION_TYPES.GET_TABLE);
    } else {
      console.error("Task infos not found or incomplete for save operation.");
    }
  }
}

function extractServiceFromUrl(url, pattern) {
  return url.split(pattern)[1].replace(/\/$/, "");
}

async function getTaskInfos(req) {
  try {
    const tableDatasetInfo = req.headers["x-table-dataset-info"];
    if (!tableDatasetInfo) {
      // Instead of throwing an error, log a debug message and return an empty array
      console.debug("x-table-dataset-info header not found, skipping log");
      return [];
    }

    const infoArray = tableDatasetInfo
      .split(";")
      .map((item) => item.split(":")[1]?.trim())
      .filter(Boolean);

    return infoArray;
  } catch (error) {
    console.error("Error extracting task infos:", error);
    return [];
  }
}

async function writeLog(
  datasetId,
  tableId,
  operationType,
  deletedCols = null,
  options = {},
  additionalData = null,
) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = buildLogMessage(
      timestamp,
      operationType,
      datasetId,
      tableId,
      deletedCols,
      options,
      additionalData,
    );

    const logPath = getLogFilePath(datasetId, tableId);
    ensureLogDirectoryExists(logPath);

    fs.appendFileSync(logPath, logMessage);
  } catch (error) {
    console.error(`Error writing to ${operationType} log:`, error);
  }
}

function buildLogMessage(
  timestamp,
  operationType,
  datasetId,
  tableId,
  deletedCols = null,
  options = {},
  additionalData = null,
) {
  let message = `[${timestamp}] -| OpType: ${operationType} -| DatasetId: ${datasetId} -| TableId: ${tableId}`;

  if (options.columnName) {
    message += ` -| ColumnName: ${options.columnName}`;
  }
  const serviceLabel =
    operationType === OPERATION_TYPES.RECONCILIATION
      ? "Reconciler"
      : "Extender";
  if (additionalData && additionalData.serviceId) {
    message += ` -| ${serviceLabel}: ${additionalData.serviceId}`;
  } else if (options.service) {
    message += ` -| Service: ${options.service}`;
  } else if (deletedCols) {
    message += ` -| DeletedCols: ${deletedCols}`;
  }

  if (additionalData) {
    const { items, ...rest } = additionalData;
    message += ` -| AdditionalData: ${JSON.stringify(rest)}`;
  }

  return message + "\n";
}

function getLogFilePath(datasetId, tableId) {
  return path.join(
    process.cwd(),
    "public",
    "logs",
    `logs-${datasetId}-${tableId}.log`,
  );
}

function ensureLogDirectoryExists(logPath) {
  const logsDir = path.dirname(logPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}
