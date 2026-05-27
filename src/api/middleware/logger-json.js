import LoggerJsonService from "../services/logger/logger-json.service.js";

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
  EXPORT: "/export",
};

// Raw body capture
const getRawBody = (req) => {
  return new Promise((resolve) => {
    if (req.body && Object.keys(req.body).length > 0) {
      return resolve(req.body);
    }
    if (req.method === "GET" || req.method === "OPTIONS") {
      return resolve({});
    }
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
    const rawBody = await getRawBody(req);
    req._rawBody = rawBody;
    await routeLogs(req, res);
  } catch (error) {
    console.error("Error in JSON logger middleware:", error);
  }
  next();
};

async function routeLogs(req, res) {
  const { method, url } = req;
  if (method === "OPTIONS") {
    console.log("OPTIONS request, skipping JSON logging.");
    return;
  }
  console.log("called url", url);
  if (url.includes(ROUTE_PATTERNS.RECONCILERS)) {
    await handleReconciliationRoute(req, res, url);
  } else if (url.includes(ROUTE_PATTERNS.EXTENDERS)) {
    await handleExtenderRoute(req, res, url);
  } else if (url.includes(ROUTE_PATTERNS.MODIFIERS)) {
    await handleModificationRoute(req, res, url);
  } else if (ROUTE_PATTERNS.SAVE.test(url)) {
    await handleSaveRoute(req, method);
  } else if (url.includes(ROUTE_PATTERNS.EXPORT)) {
    handleExportOperation(req, url);
  }
}

async function handleExportOperation(req, url) {
  try {
    const taskInfos = await getTaskInfos(req);
    const [tableId, datasetId] = taskInfos;
    const format = req.query.format;
    console.log("*** request obj", format);
    LoggerJsonService.logExportTable(datasetId, tableId, format);
  } catch (error) {
    console.error("error handling export JSON logging", error);
  }
}

async function handleReconciliationRoute(req, res, url) {
  // Skip logging for automated redo-after-delete reconciliations
  const tableDatasetInfo = req.headers["x-table-dataset-info"] || "";
  if (tableDatasetInfo.includes("skipLog=1")) return;

  const requestedReconciliation = extractServiceFromUrl(
    url,
    ROUTE_PATTERNS.RECONCILERS,
  );
  const taskInfos = await getTaskInfos(req);

  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;
    const body = req._rawBody || req.body;

    // Log only after the response is sent and only on success.
    interceptResponse(res, async (_responseBody) => {
      await LoggerJsonService.logReconciliation({
        datasetId,
        tableId,
        columnName,
        service: requestedReconciliation,
        additionalData: body,
      });
    });
  }
}

async function handleExtenderRoute(req, res, url) {
  let requestedExtender = extractServiceFromUrl(url, ROUTE_PATTERNS.EXTENDERS);
  if (req.body && req.body.serviceId) {
    requestedExtender += `-${req.body.serviceId}`;
  }
  const taskInfos = await getTaskInfos(req);
  console.log("extension taskinfos", taskInfos);
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    interceptResponse(res, async (responseBody) => {
      const createdColumns = extractCreatedColumns(responseBody);
      console.log(
        `📋 [JSON] EXTENSION LOGGED - Service: ${requestedExtender} | Dataset: ${datasetId} | Table: ${tableId} | Column: ${columnName} | CreatedColumns: ${createdColumns}`,
      );
      await LoggerJsonService.logExtension({
        datasetId,
        tableId,
        columnName,
        service: requestedExtender,
        additionalData: req._rawBody || req.body,
        createdColumns,
      });
    });
  }
}

async function handleModificationRoute(req, res, url) {
  let requestedModifier = extractServiceFromUrl(url, ROUTE_PATTERNS.MODIFIERS);
  if (req.body && req.body.serviceId) {
    requestedModifier += `-${req.body.serviceId}`;
  }
  const taskInfos = await getTaskInfos(req);
  console.log("modification taskinfos", taskInfos);
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, columnName] = taskInfos;

    interceptResponse(res, async (responseBody) => {
      const createdColumns = extractCreatedColumns(responseBody);
      console.log(
        `📋 [JSON] MODIFICATION LOGGED - Function: ${requestedModifier} | Dataset: ${datasetId} | Table: ${tableId} | Column: ${columnName} | CreatedColumns: ${createdColumns}`,
      );
      await LoggerJsonService.logModification({
        datasetId,
        tableId,
        columnName,
        service: requestedModifier,
        additionalData: req._rawBody || req.body,
        createdColumns,
      });
    });
  }
}

async function handleSaveRoute(req, method) {
  const taskInfos = await getTaskInfos(req);
  if (taskInfos && taskInfos.length === 3) {
    const [tableId, datasetId, deletedCols] = taskInfos;
    if (method === "PUT") {
      LoggerJsonService.logSave({ datasetId, tableId, deletedCols });
    }
  } else if (taskInfos && taskInfos.length === 2) {
    const [tableId, datasetId] = taskInfos;
    if (method === "PUT") {
      LoggerJsonService.logSave({ datasetId, tableId });
    }
    if (method === "GET") {
      LoggerJsonService.logGetTable({ datasetId, tableId });
    } else {
      console.error("Task infos not found or incomplete for save operation.");
    }
  }
}

/**
 * Monkey-patches res.json so that `callback` is invoked with the response
 * body right before the original json() sends it — but ONLY when the HTTP
 * status code indicates success (2xx).  Errors are never logged.
 */
function interceptResponse(res, callback) {
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await callback(body);
      }
    } catch (err) {
      console.error("[JSON logger] Error in post-response log callback:", err);
    }
    return originalJson(body);
  };
}

function extractCreatedColumns(responseBody) {
  try {
    if (!responseBody || typeof responseBody !== "object") return [];
    const cols = responseBody.columns;
    if (!cols || typeof cols !== "object") return [];
    return Object.values(cols)
      .map((col) => col?.label || col?.id || null)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function extractServiceFromUrl(url, pattern) {
  return url.split(pattern)[1].replace(/\/$/, "");
}

async function getTaskInfos(req) {
  try {
    const tableDatasetInfo = req.headers["x-table-dataset-info"];
    if (!tableDatasetInfo) {
      console.debug("x-table-dataset-info header not found, skipping JSON log");
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
