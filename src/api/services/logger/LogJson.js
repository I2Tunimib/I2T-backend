import fs from "fs";
import readline from "readline";

export class LogJson {
  #operations = [];

  constructor(datasetId, tableId) {
    this.datasetId = datasetId;
    this.tableId = tableId;
    this.#parseLogFile();
  }

  /**
   * Parse a single JSON line from the .jsonl log file.
   * Returns null for lines that are not valid operation entries
   * (e.g. the schema entry or malformed lines).
   * @private
   */
  #parseLine(line) {
    try {
      const parsed = JSON.parse(line);

      // Skip the schema entry — it's not an operation
      if (parsed.type === "schema") return null;

      const {
        timestamp,
        operationType: opType,
        columnName: colName = "",
        service = "",
        additionalData = {},
        id,
        opNumber,
        datasetId,
        tableId,
        deletedCols,
      } = parsed;

      return {
        id,
        ...(opNumber !== undefined ? { opNumber } : {}),
        timestamp: new Date(timestamp),
        opType,
        colName,
        service,
        additionalData,
        ...(deletedCols !== undefined ? { deletedCols } : {}),
        datasetId,
        tableId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse the .jsonl log file, applying the same slicing logic as Log.js:
   * - Reverse the lines so newest-first
   * - Find the first SAVE_TABLE and slice from there
   * - Find the first GET_TABLE after that save and slice up to (and including) it
   * @private
   */
  async #parseLogFile() {
    if (this.datasetId && this.tableId) {
      const logFilePath = `public/logs/logs-${this.datasetId}-${this.tableId}.jsonl`;

      if (!fs.existsSync(logFilePath)) {
        console.debug(`[LogJson] Log file not found: ${logFilePath}`);
        return;
      }

      const fileStream = fs.createReadStream(logFilePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let orderedLines = [];
      for await (const line of rl) {
        const parsed = this.#parseLine(line);
        if (parsed !== null) {
          orderedLines.unshift(parsed);
        }
      }

      const firstSaveTableOp = orderedLines.findIndex(
        (item) => item.opType === "SAVE_TABLE",
      );
      orderedLines = orderedLines.slice(firstSaveTableOp);

      const firstGetTableAfterSave = orderedLines.findIndex(
        (item) => item.opType === "GET_TABLE",
      );
      orderedLines = orderedLines.slice(0, firstGetTableAfterSave + 1);

      for (const line of orderedLines) {
        console.log("LINE: ", line);
      }

      this.#operations = orderedLines;
    }
  }

  /**
   * Returns the parsed operations after the log file has been loaded.
   */
  getOperations() {
    return this.#operations;
  }
}
