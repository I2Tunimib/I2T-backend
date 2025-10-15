import LoggerService from "../services/logger/logger.service.js";

// Operation types
const OPERATION_TYPES = {
  RECONCILIATION: "RECONCILIATION",
  EXTENSION: "EXTENSION",
  MODIFICATION: "MODIFICATION",
  SAVE: "SAVE_TABLE",
  GET_TABLE: "GET_TABLE",
};

// Route patterns
const ROUTE_PATTERNS = {
  SAVE: /^\/api\/dataset\/\d+\/table\/\d+\/?$/,
  RECONCILERS: "/api/reconcilers",
  EXTENDERS: "/api/extenders",
  MODIFIERS: "/api/modifiers",
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
  console.log("called url", url);
  // Handle different route types
  if (url.includes(ROUTE_PATTERNS.RECONCILERS)) {
    await handleReconciliationRoute(req, url);
  } else if (url.includes(ROUTE_PATTERNS.EXTENDERS)) {
    await handleExtenderRoute(req, url);
  } else if (url.includes(ROUTE_PATTERNS.MODIFIERS)) {
    await handleModificationRoute(req, url);
  } else if (ROUTE_PATTERNS.SAVE.test(url)) {
    await handleSaveRoute(req, method);
  }
}

async function handleReconciliationRoute(req, url) {
  const requestedReconciliation = extractServiceFromUrl(
    url,
    ROUTE_PATTERNS.RECONCILERS
  );
  const taskInfos = await getTaskInfos(req);

  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    LoggerService.logReconciliation({
      datasetId,
      tableId,
      columnName,
      service: requestedReconciliation,
      additionalData: req._rawBody || req.body,
    });
  }
}

async function handleExtenderRoute(req, url) {
  let requestedExtender = extractServiceFromUrl(url, ROUTE_PATTERNS.EXTENDERS);
  if (req.body && req.body.serviceId) {
    requestedExtender += `-${req.body.serviceId}`;
  }
  const taskInfos = await getTaskInfos(req);
  console.log("extension taskinfos", taskInfos);
  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    console.log(
      `📋 EXTENSION LOGGED - Service: ${requestedExtender} | Dataset: ${datasetId} | Table: ${tableId} | Column: ${columnName}`
    );

    LoggerService.logExtension({
      datasetId,
      tableId,
      columnName,
      service: requestedExtender,
      additionalData: req._rawBody || req.body,
    });
  }
}

async function handleModificationRoute(req, url) {
  let requestedModifier = extractServiceFromUrl(url, ROUTE_PATTERNS.MODIFIERS);
  if (req.body && req.body.serviceId) {
    requestedModifier += `-${req.body.serviceId}`;
  }
  const taskInfos = await getTaskInfos(req);
  console.log("modification taskinfos", taskInfos);
  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    console.log(
        `📋 MODIFICATION LOGGED - Function: ${requestedModifier} | Dataset: ${datasetId} | Table: ${tableId} | Column: ${columnName}`
    );

    LoggerService.logModification({
      datasetId,
      tableId,
      columnName,
      service: requestedModifier,
      additionalData: req._rawBody || req.body,
    });
  }
}

async function handleSaveRoute(req, method) {
  const taskInfos = await getTaskInfos(req);

  // Only log if we have all the required information
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, deletedCols] = taskInfos;

    if (method === "PUT") {
      LoggerService.logSave({ datasetId, tableId, deletedCols });
    }
  } else if (taskInfos && taskInfos.length === 2) {
    const [tableId, datasetId] = taskInfos;
    if (method === "PUT") {
      LoggerService.logSave({ datasetId, tableId });
    }
    if (method === "GET") {
      LoggerService.logGetTable({ datasetId, tableId });
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
