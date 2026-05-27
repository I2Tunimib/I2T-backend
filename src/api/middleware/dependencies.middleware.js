import { Log } from "../services/logger/Log.js";

/**
 * Middleware that reads the X-Table-Dataset-Info header sent by the frontend
 * for service requests (reconcile, extend, modify).
 *
 * Header format: "tableId:<id>;datasetId:<id>[;columnName:<name>]"
 *
 * When the header is present it:
 *  1. Parses tableId / datasetId from the header
 *  2. Patches res.json so that every response from the route handler gets a
 *     `dependencies` field added automatically, built **after** the operation
 *     has been logged (i.e. inside the patched res.json call).
 */
const dependenciesMiddleware = (req, res, next) => {
  const headerValue = req.headers["x-table-dataset-info"];

  if (!headerValue) {
    return next();
  }

  try {
    // Parse "tableId:abc;datasetId:xyz[;columnName:col]"
    const parts = Object.fromEntries(
      headerValue.split(";").map((part) => {
        const idx = part.indexOf(":");
        return [part.slice(0, idx).trim(), part.slice(idx + 1).trim()];
      }),
    );

    const { tableId, datasetId } = parts;

    if (!tableId || !datasetId) {
      return next();
    }

    // Patch res.json to inject the dependencies field.
    // The graph is built HERE (inside res.json) so it runs AFTER the operation
    // has been written to the log file by the route handler.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const logInstance = new Log(datasetId, tableId);
        logInstance.buildDependencyGraph();
        const dependencies = logInstance.getObject();
        if (body !== null && typeof body === "object" && !Array.isArray(body)) {
          body = { ...body, dependencies };
        }
      } catch (depErr) {
        console.error(
          "[dependenciesMiddleware] Error building dependency graph in res.json:",
          depErr,
        );
      }
      return originalJson(body);
    };
  } catch (err) {
    // Log the error but don't block the request
    console.error(
      "[dependenciesMiddleware] Error building dependency graph:",
      err,
    );
  }

  next();
};

export default dependenciesMiddleware;
