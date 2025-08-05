import fs from "fs";
import path from "path";

/**
 * LoggerService provides logging operations for dataset/table actions.
 * It is based on the logger middleware logic, but refactored as a service class.
 */
class LoggerService {
  static OPERATION_TYPES = {
    RECONCILIATION: "RECONCILIATION",
    EXTENSION: "EXTENSION",
    SAVE: "SAVE_TABLE",
    GET_TABLE: "GET_TABLE",
    PROPAGATE_TYPE: "PROPAGATE_TYPE",
  };

  /**
   * Log a type propagation operation.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string} params.columnName
   * @param {Object} [params.additionalData]
   */
  static logTypePropagation(
    datasetId,
    tableId,
    columnName,
    additionalData = {},
  ) {
    return LoggerService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerService.OPERATION_TYPES.PROPAGATE_TYPE,
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
    return LoggerService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerService.OPERATION_TYPES.RECONCILIATION,
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
  }) {
    return LoggerService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerService.OPERATION_TYPES.EXTENSION,
      options: { columnName, service },
      additionalData,
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
    return LoggerService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerService.OPERATION_TYPES.SAVE,
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
    return LoggerService.#writeLog({
      datasetId,
      tableId,
      operationType: LoggerService.OPERATION_TYPES.GET_TABLE,
    });
  }

  /**
   * Internal method to write a log entry.
   * @param {Object} params
   * @param {string|number} params.datasetId
   * @param {string|number} params.tableId
   * @param {string} params.operationType
   * @param {string|number|null} [params.deletedCols]
   * @param {Object} [params.options]
   * @param {Object} [params.additionalData]
   * @private
   */
  static #writeLog({
    datasetId,
    tableId,
    operationType,
    deletedCols = null,
    options = {},
    additionalData = null,
  }) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = LoggerService.#buildLogMessage(
        timestamp,
        operationType,
        datasetId,
        tableId,
        deletedCols,
        options,
        additionalData,
      );

      const logPath = LoggerService.#getLogFilePath(datasetId, tableId);
      LoggerService.#ensureLogDirectoryExists(logPath);

      fs.appendFileSync(logPath, logMessage);
    } catch (error) {
      console.error(`Error writing to ${operationType} log:`, error);
    }
  }

  /**
   * Build a log message string.
   * @private
   */
  static #buildLogMessage(
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
      operationType === LoggerService.OPERATION_TYPES.RECONCILIATION
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

  /**
   * Get the log file path for a dataset/table.
   * @private
   */
  static #getLogFilePath(datasetId, tableId) {
    return path.join(
      process.cwd(),
      "public",
      "logs",
      `logs-${datasetId}-${tableId}.log`,
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

export default LoggerService;
