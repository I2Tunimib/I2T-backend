import fs from "fs";
import path from "path";
import crypto from "crypto";
import FileSystemService from "../datasets/datasets.service.js";

/**
 * LoggerJsonService provides logging operations for dataset/table actions.
 * It mirrors LoggerService but writes logs as JSON objects (JSON Lines format).
 * The first line of each log file is a schema entry listing table columns,
 * written only once when the log file is first created.
 */
class LoggerJsonService {
  static OPERATION_TYPES = {
    RECONCILIATION: "RECONCILIATION",
    EXTENSION: "EXTENSION",
    MODIFICATION: "MODIFICATION",
    SAVE: "SAVE_TABLE",
    GET_TABLE: "GET_TABLE",
    PROPAGATE_TYPE: "PROPAGATE_TYPE",
    EXPORT: "EXPORT",
  };

  static logExportTable(datasetId, tableId, format) {
    console.log("*** [JSON] logging export table", datasetId, tableId, format);
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.EXPORT,
      options: { format },
      additionalData: { format },
    });
  }

  /**
   * Log a type propagation operation.
   * @param {string|number} datasetId
   * @param {string|number} tableId
   * @param {string} columnName
   * @param {Object} [additionalData]
   */
  static logTypePropagation(
    datasetId,
    tableId,
    columnName,
    additionalData = {},
  ) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.PROPAGATE_TYPE,
      options: { columnName },
      additionalData,
    });
  }

  /**
   * Log a reconciliation operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string} params.columnName
   * @param {string} params.service
   * @param {Object} [params.additionalData]
   */
  static logReconciliation({
    datasetId,
    tableId,
    columnName,
    service,
    additionalData = {},
  }) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.RECONCILIATION,
      options: { columnName, service },
      additionalData,
    });
  }

  /**
   * Log an extension operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string} params.columnName
   * @param {string} params.service
   * @param {Object} [params.additionalData]
   */
  static logExtension({
    datasetId,
    tableId,
    columnName,
    service,
    additionalData = {},
    createdColumns = [],
  }) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.EXTENSION,
      options: { columnName, service },
      additionalData,
      createdColumns,
    });
  }

  /**
   * Log a modification operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string} params.columnName
   * @param {string} params.service
   * @param {Object} [params.additionalData]
   */
  static logModification({
    datasetId,
    tableId,
    columnName,
    service,
    additionalData = {},
    createdColumns = [],
  }) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.MODIFICATION,
      options: { columnName, service },
      additionalData,
      createdColumns,
    });
  }

  /**
   * Log a table save operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string|number|null} [params.deletedCols]
   */
  static logSave({ datasetId, tableId, deletedCols = null }) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.SAVE,
      deletedCols,
    });
  }

  /**
   * Log a table get operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   */
  static logGetTable({ datasetId, tableId }) {
    return LoggerJsonService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerJsonService.OPERATION_TYPES.GET_TABLE,
    });
  }

  /**
   * Internal method to write a log entry as a JSON object.
   * Ensures the schema entry (first line) is present before writing the log.
   * @private
   */
  static async #writeLog({
    datasetId,
    tableId,
    operationType,
    deletedCols = null,
    options = {},
    additionalData = null,
    createdColumns = [],
  }) {
    try {
      console.log("*** [JSON] write log params", datasetId, tableId);

      const logPath = LoggerJsonService.#getLogFilePath(datasetId, tableId);
      LoggerJsonService.#ensureLogDirectoryExists(logPath);

      // Ensure the schema entry (first line) is written exactly once
      await LoggerJsonService.#ensureSchemaEntry(logPath, datasetId, tableId);

      const EXCLUDED_TYPES = [
        LoggerJsonService.OPERATION_TYPES.GET_TABLE,
        LoggerJsonService.OPERATION_TYPES.SAVE,
      ];
      const needsOpNumber = !EXCLUDED_TYPES.includes(operationType);
      const opNumber = needsOpNumber
        ? LoggerJsonService.#computeNextOpNumber(logPath)
        : undefined;

      const timestamp = new Date().toISOString();
      const id = crypto.randomUUID();
      const logEntry = LoggerJsonService.#buildLogEntry(
        timestamp,
        operationType,
        datasetId,
        tableId,
        deletedCols,
        options,
        additionalData,
        id,
        opNumber,
        createdColumns,
      );

      fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.error(`Error writing to ${operationType} JSON log:`, error);
    }
  }

  /**
   * Writes the schema entry as the very first line of the log file,
   * but only if it is not already present.
   * @private
   */
  static async #ensureSchemaEntry(logPath, datasetId, tableId) {
    // If file already exists, check if first line is already a schema entry
    if (fs.existsSync(logPath)) {
      const firstLine = LoggerJsonService.#readFirstLine(logPath);
      if (firstLine) {
        try {
          const parsed = JSON.parse(firstLine);
          if (parsed.type === "schema") {
            // Schema entry already present — never update it
            return;
          }
        } catch {
          // First line is not valid JSON; fall through to prepend schema
        }
      }
    }

    // Build schema entry by fetching table columns
    const columns = await LoggerJsonService.#fetchTableColumns(
      datasetId,
      tableId,
    );
    const schemaEntry = {
      type: "schema",
      datasetId,
      tableId,
      columns,
      createdAt: new Date().toISOString(),
    };

    if (fs.existsSync(logPath)) {
      // Prepend schema entry to existing file content
      const existingContent = fs.readFileSync(logPath, "utf8");
      fs.writeFileSync(
        logPath,
        JSON.stringify(schemaEntry) + "\n" + existingContent,
      );
    } else {
      fs.writeFileSync(logPath, JSON.stringify(schemaEntry) + "\n");
    }
  }

  /**
   * Reads the first line of a file without loading the entire file.
   * @private
   */
  static #readFirstLine(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const newlineIndex = content.indexOf("\n");
      return newlineIndex === -1 ? content : content.substring(0, newlineIndex);
    } catch {
      return null;
    }
  }

  /**
   * Fetches the list of column labels for a given table using FileSystemService.
   * Returns an empty array if columns cannot be retrieved.
   * @private
   */
  static async #fetchTableColumns(datasetId, tableId) {
    try {
      const tableData = await FileSystemService.findTable(datasetId, tableId);
      if (!tableData || !tableData.columns) return [];

      const { columns } = tableData;

      // columns can be { byId: {...}, allIds: [...] } or a plain object
      if (columns.byId && columns.allIds) {
        return columns.allIds.map((id) => columns.byId[id]?.label || id);
      }

      // Plain object keyed by column id
      return Object.values(columns).map((col) => col.label || col.id || col);
    } catch (error) {
      console.error(
        "[JSON logger] Could not fetch table columns for schema entry:",
        error,
      );
      return [];
    }
  }

  /**
   * Reads the log file and finds the highest opNumber already assigned,
   * then returns the next value (1-based).
   *
   * Using max instead of count ensures correctness after operations are
   * deleted: surviving entries keep their original opNumbers so the next
   * one must be max+1, not count+1.
   * @private
   */
  static #computeNextOpNumber(logPath) {
    try {
      if (!fs.existsSync(logPath)) return 1;
      const content = fs.readFileSync(logPath, "utf8");
      const maxOpNumber = content
        .split("\n")
        .filter(Boolean)
        .reduce((max, line) => {
          try {
            const parsed = JSON.parse(line);
            return parsed.opNumber !== undefined
              ? Math.max(max, parsed.opNumber)
              : max;
          } catch {
            return max;
          }
        }, 0);
      return maxOpNumber + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Build a log entry object.
   * @private
   */
  static #buildLogEntry(
    timestamp,
    operationType,
    datasetId,
    tableId,
    deletedCols = null,
    options = {},
    additionalData = null,
    id = undefined,
    opNumber = undefined,
    createdColumns = [],
  ) {
    const entry = {
      id,
      ...(opNumber !== undefined ? { opNumber } : {}),
      timestamp,
      operationType,
      datasetId,
      tableId,
    };

    if (options.columnName !== undefined) {
      entry.columnName = options.columnName;
    }

    const labels = {
      [LoggerJsonService.OPERATION_TYPES.RECONCILIATION]: "reconciler",
      [LoggerJsonService.OPERATION_TYPES.EXTENSION]: "extender",
      [LoggerJsonService.OPERATION_TYPES.MODIFICATION]: "modifier",
    };
    const serviceLabel = labels[operationType];

    if (additionalData && additionalData.serviceId) {
      entry[serviceLabel || "service"] = additionalData.serviceId;
    } else if (options.service) {
      entry.service = options.service;
    }

    if (deletedCols !== null) {
      entry.deletedCols = deletedCols;
    }

    if (
      createdColumns &&
      createdColumns.length > 0 &&
      [
        LoggerJsonService.OPERATION_TYPES.EXTENSION,
        LoggerJsonService.OPERATION_TYPES.MODIFICATION,
      ].includes(operationType)
    ) {
      entry.createdColumns = createdColumns;
    }

    if (additionalData) {
      // Exclude large 'items' payload to keep logs concise
      const { items, ...rest } = additionalData;
      entry.additionalData = rest;
    }

    return entry;
  }

  /**
   * Get the JSON log file path for a dataset/table.
   * @private
   */
  static #getLogFilePath(datasetId, tableId) {
    return path.join(
      process.cwd(),
      "public",
      "logs",
      `logs-${datasetId}-${tableId}.jsonl`,
    );
  }

  /**
   * Ensure the log directory exists.
   * @private
   */
  static #ensureLogDirectoryExists(logPath) {
    const logsDir = path.dirname(logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }
}

export default LoggerJsonService;
