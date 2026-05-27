import fs from "fs";
import util from "util";

export class Log {
  #operations = [];
  #columns = {};
  #nonConsolidatedIds = [];
  #nodes = {
    root: {
      children: [],
      parents: [],
    },
  };
  #tableData = null;
  constructor(datasetId, tableId) {
    this.datasetId = datasetId;
    this.tableId = tableId;
    this.#parseLogFileJson();
    if (this.#tableData !== null && this.#tableData.columns) {
      for (const col of this.#tableData.columns) {
        this.#columns[col] = { type: "original", lastOpId: null };
      }
    }
  }
  #getServiceConfig(serviceName) {
    const categories = ["reconcilers", "extenders", "modifiers"];
    for (const category of categories) {
      const filePath = `${process.cwd()}/src/services/${category}/${serviceName}/index.js`;
      if (fs.existsSync(filePath)) {
        const src = fs.readFileSync(filePath, "utf-8");
        const objSrc = src
          .replace(/^\s*export\s+default\s+/, "")
          .replace(/;\s*$/, "");
        return new Function("process", `return (${objSrc})`)(process);
      }
    }
    return null;
  }
  #getOpSupportColumns(operation) {
    let serviceName =
      operation.reconciler ?? operation.modifier ?? operation.extender ?? null;
    if (serviceName !== null) {
      const serviceConfiguration = this.#getServiceConfig(serviceName);
      if (
        serviceConfiguration !== null &&
        serviceConfiguration.public &&
        serviceConfiguration.public.formParams
      ) {
        for (const formItem of serviceConfiguration.public.formParams) {
          if (formItem.inputType === "multipleColumnSelect") {
            return Object.keys(operation.additionalData[formItem.id]).filter(
              (col) => col !== operation.columnName,
            );
          }
          if (formItem.inputType === "selectColumns") {
            const rows = operation.additionalData?.[formItem.id];
            if (rows && typeof rows === "object") {
              const firstRow = Object.values(rows)[0];
              // Each row is [resolvedValue, options, columnName]
              if (
                Array.isArray(firstRow) &&
                firstRow[2] &&
                firstRow[2] !== operation.columnName
              ) {
                return [firstRow[2]];
              }
            }
          }
        }
      }
    }
    return [];
  }
  #parseLine(line) {
    const parts = line.split("-|");
    const timestampString = parts[0];
    const m = timestampString.match(/\[([^\]]+)\]/);
    if (!m) return null;

    const ts = m[1].trim(); // e.g. "2025-11-05T10:17:35.988Z"

    // For ISO-8601 timestamps `new Date()` works in modern JS engines
    const timestamp = new Date(ts);
    let opType = parts[1].replace("OpType:", "").trim();
    if (!["SAVE_TABLE", "GET_TABLE"].includes(opType) && parts.length >= 6) {
      let colName = parts[4].replace("ColumnName:", "").trim();
      let service = parts[5]
        .replace("Extender:", "")
        .replace("Reconciler:", "")
        .replace("Modifier:", "")
        .trim();
      let additionalData = JSON.parse(
        parts[6].replace("AdditionalData:", "").trim(),
      );
      return {
        timestamp,
        opType,
        colName,
        service,
        additionalData,
      };
    } else {
      return {
        timestamp,
        opType,
        colName: "",
        service: "",
        additionalData: {},
      };
    }
  }

  async #parseLogFile() {
    if (this.datasetId && this.tableId) {
      const logFilePath = `public/logs/logs-${this.datasetId}-${this.tableId}.log`;
      const fileStream = fs.createReadStream(logFilePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      let orderedLines = [];
      for await (const line of rl) {
        // console.log("LINE:", line);
        orderedLines.unshift(this.#parseLine(line));
      }
      const firstSaveTableOp = orderedLines.findIndex((item) => {
        return item.opType === "SAVE_TABLE";
      });
      orderedLines = orderedLines.slice(firstSaveTableOp);

      const firstGetTableAfterSave = orderedLines.findIndex((item) => {
        return item.opType === "GET_TABLE";
      });
      orderedLines = orderedLines.slice(0, firstGetTableAfterSave + 1);
    }
  }

  #parseLogFileJson() {
    if (this.datasetId && this.tableId) {
      const logFilePath = `public/logs/logs-${this.datasetId}-${this.tableId}.jsonl`;
      // If file doesn't exist, bail out
      if (!fs.existsSync(logFilePath)) {
        this.#tableData = null;
        this.#operations = [];
        return;
      }

      const rawLines = fs.readFileSync(logFilePath, "utf-8").split(/\r?\n/);

      const parsedLines = []; // will hold parsed operations in reverse order (newest first)
      let index = 0;
      for (const line of rawLines) {
        if (!line || !line.trim()) {
          index++;
          continue;
        }
        try {
          const parsedLine = JSON.parse(line);
          if (index === 0) {
            this.#tableData = parsedLine;
          } else {
            parsedLines.unshift(parsedLine);
          }
        } catch (err) {
          // skip malformed lines
        }
        index++;
      }

      // Find the last SAVE_TABLE index to use as the consolidation boundary
      let lastSaveTableIdx = -1;
      for (let i = parsedLines.length - 1; i >= 0; i--) {
        if (parsedLines[i] && parsedLines[i].operationType === "SAVE_TABLE") {
          lastSaveTableIdx = i;
          break;
        }
      }

      // Collect IDs of non-consolidated ops (entries newer than the last save).
      // parsedLines is newest-first, so indices 0..lastSaveTableIdx-1 are non-consolidated.
      this.#nonConsolidatedIds =
        lastSaveTableIdx > 0
          ? parsedLines
              .slice(0, lastSaveTableIdx)
              .filter((item) => item && item.id)
              .map((item) => item.id)
          : [];

      // Annotate each operation with a consolidated flag (true = committed before last save)
      // then filter out SAVE_TABLE and GET_TABLE entries
      const orderedLines = parsedLines
        .map((item, idx) =>
          item
            ? {
                ...item,
                // parsedLines is newest-first (built with unshift), so ops
                // that are OLDER than the last save sit at HIGHER indices
                consolidated: lastSaveTableIdx >= 0 && idx > lastSaveTableIdx,
              }
            : item,
        )
        .filter(
          (item) =>
            item &&
            !["SAVE_TABLE", "GET_TABLE", "EXPORT"].includes(item.operationType),
        );

      this.#operations = orderedLines;
      for (const op of orderedLines) {
        if (op.createdColumns) {
          for (const col of op.createdColumns) {
            this.#columns[col] = {
              type: "created",
              lastOpId: null,
              createdBy: op.id,
            };
          }
        }
      }
    }
  }
  #appendOperationNode(operation) {
    const opColName = operation.columnName;
    const sup = this.#getOpSupportColumns(operation);

    // Skip operations with no column name to avoid polluting #columns with an "undefined" key
    if (!opColName) return;

    // Ensure the column entry exists (may be absent for pre-save historical ops)
    if (!this.#columns[opColName]) {
      this.#columns[opColName] = { type: "original", lastOpId: null };
    }

    //check if the operation is done on a column that has not been operated on yes
    if (
      this.#columns[opColName] &&
      this.#columns[opColName].lastOpId === null
    ) {
      if (this.#columns[opColName].type === "original") {
        this.#nodes["root"].children.push(operation.id);
        this.#nodes[operation.id] = {
          children: [],
          parents: ["root"],
          supportChildren: [],
          supportParents: [],
        };

        this.#columns[opColName].lastOpId = operation.id;
        //check for support dependencies
        if (sup.length > 0) {
          for (const supCol of sup) {
            const colData = this.#columns[supCol];
            if (colData.lastOpId !== null && colData.type === "original") {
              this.#nodes[colData.lastOpId].supportChildren.push(operation.id);
              this.#nodes[operation.id].supportParents.push(colData.lastOpId);
            } else if (colData.type === "created") {
              if (colData.lastOpId !== null) {
                this.#nodes[colData.lastOpId].supportChildren.push(
                  operation.id,
                );
                this.#nodes[operation.id].supportParents.push(colData.lastOpId);
              } else {
                this.#nodes[colData.createdBy].supportChildren.push(
                  operation.id,
                );
                this.#nodes[operation.id].supportParents.push(
                  colData.createdBy,
                );
              }
            }
          }
        }
      } else if (this.#columns[opColName].type === "created") {
        let columnCreator = this.#getOpById(this.#columns[opColName].createdBy);
        this.#nodes[columnCreator.id].children.push(operation.id);
        this.#nodes[operation.id] = {
          children: [],
          parents: [columnCreator.id],
          supportChildren: [],
          supportParents: [],
        };
      }
    } else if (
      this.#columns[opColName] &&
      this.#columns[opColName].lastOpId !== null
    ) {
      const lastOp = this.#getOpById(this.#columns[opColName].lastOpId);
      switch (operation.operationType) {
        case "EXTENSION":
          if (
            ["RECONCILIATION", "PROPAGATE_TYPE"].includes(lastOp.operationType)
          ) {
            this.#nodes[lastOp.id].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: [lastOp.id],
              supportChildren: [],
              supportParents: [],
            };
          } else if (
            ["EXTENSION", "MODIFICATION"].includes(lastOp.operationType)
          ) {
            let lastOpDirectParent = this.#getCurrentColParent(
              lastOp,
              operation.columnName,
            );
            if (lastOpDirectParent !== null) {
              this.#nodes[lastOpDirectParent.id].children.push(operation.id);
              this.#nodes[operation.id] = {
                children: [],
                parents: [lastOpDirectParent.id],
                supportChildren: [],
                supportParents: [],
              };
            }
          }

          //check for support dependencies
          if (sup.length > 0) this.#addSupportDeps(operation, sup);
          break;
        case "RECONCILIATION":
          if (lastOp.operationType === "RECONCILIATION") {
            let parent = this.#getCurrentColParent(
              lastOp,
              operation.columnName,
            );
            // Fall back to the direct last op when no matching ancestor exists
            // (e.g. lastOp's only parent is the virtual "root" node)
            const parentId = parent !== null ? parent.id : lastOp.id;
            this.#nodes[parentId].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: [parentId],
              supportChildren: [],
              supportParents: [],
            };
          } else if (
            ["EXTENSION", "MODIFICATION", "PROPAGATE_TYPE"].includes(
              lastOp.operationType,
            )
          ) {
            this.#nodes[lastOp.id].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: [lastOp.id],
              supportChildren: [],
              supportParents: [],
            };
          } else {
            let lastOpDirectParent = this.#getCurrentColParent(
              lastOp,
              operation.columnName,
            );
            while (
              lastOpDirectParent !== null &&
              ![
                "RECONCILIATION",
                "EXTENSION",
                "MODIFICATION",
                "PROPAGATE_TYPE",
              ].includes(lastOpDirectParent.operationType)
            ) {
              lastOpDirectParent = this.#getCurrentColParent(
                lastOp,
                operation.columnName,
              );
            }

            if (lastOpDirectParent !== null) {
              this.#nodes[lastOpDirectParent.id].children.push(operation.id);
              this.#nodes[operation.id] = {
                children: [],
                parents: [lastOpDirectParent.id],
                supportChildren: [],
                supportParents: [],
              };
            }
          }
          //check for support dependencies
          if (sup.length > 0) this.#addSupportDeps(operation, sup);
          break;
        case "MODIFICATION":
          if (
            ["RECONCILIATION", "PROPAGATE_TYPE"].includes(lastOp.operationType)
          ) {
            this.#nodes[lastOp.id].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: [lastOp.id],
              supportChildren: [],
              supportParents: [],
            };
          } else if (lastOp.operationType === "EXTENSION") {
            //TODO: check dependencies between support col from EXTENSION
            let lastOpDirectParent = this.#getCurrentColParent(
              lastOp,
              operation.columnName,
            );
            while (
              lastOpDirectParent !== null &&
              lastOpDirectParent.operationType !== "MODIFICATION"
            ) {
              lastOpDirectParent = this.#getCurrentColParent(
                lastOp,
                operation.columnName,
              );
              if (lastOpDirectParent === null) {
                break;
              }
            }
            if (lastOpDirectParent === null) {
              this.#nodes["root"].children.push(operation.id);
              this.#nodes[operation.id] = {
                children: [],
                parents: ["root"],
                supportChildren: [],
                supportParents: [],
              };
            } else {
              this.#nodes[lastOpDirectParent.id].children.push(operation.id);
              this.#nodes[operation.id] = {
                children: [],
                parents: [lastOpDirectParent.id],
                supportChildren: [],
                supportParents: [],
              };
            }
          }
          //check for support dependencies
          if (sup.length > 0) this.#addSupportDeps(operation, sup);
          break;
        case "PROPAGATE_TYPE": {
          // PROPAGATE_TYPE must always attach directly to the most recent
          // RECONCILIATION for this column (it is a required step before any
          // extension can operate on the reconciled types).
          let reconParent = null;
          if (lastOp.operationType === "RECONCILIATION") {
            reconParent = lastOp;
          } else {
            // Edge case: scan already-processed ops to find the most recent
            // RECONCILIATION for this column.
            const candidates = this.#operations
              .filter(
                (op) =>
                  op.columnName === opColName &&
                  op.operationType === "RECONCILIATION" &&
                  op.opNumber < operation.opNumber &&
                  this.#nodes[op.id],
              )
              .sort((a, b) => b.opNumber - a.opNumber);
            reconParent = candidates[0] ?? null;
          }
          if (reconParent !== null) {
            this.#nodes[reconParent.id].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: [reconParent.id],
              supportChildren: [],
              supportParents: [],
            };
          } else {
            // No reconciliation found yet; attach to root as a safe fallback.
            this.#nodes["root"].children.push(operation.id);
            this.#nodes[operation.id] = {
              children: [],
              parents: ["root"],
              supportChildren: [],
              supportParents: [],
            };
          }
          break;
        }
      }
    }
    this.#updateLastOp(operation);
  }
  /**
   * Wire support (cross-column) dependencies for an operation.
   * Guards against nodes that were never registered (e.g. skipped due to null
   * parent paths) so a missing node doesn't crash the whole graph build.
   */
  #addSupportDeps(operation, sup) {
    for (const supCol of sup) {
      const colData = this.#columns[supCol];
      if (!colData) continue;
      const opNode = this.#nodes[operation.id];
      if (!opNode) continue;

      let parentNodeId = null;
      if (colData.type === "original" && colData.lastOpId !== null) {
        parentNodeId = colData.lastOpId;
      } else if (colData.type === "created") {
        parentNodeId =
          colData.lastOpId !== null ? colData.lastOpId : colData.createdBy;
      }

      if (parentNodeId && this.#nodes[parentNodeId]) {
        this.#nodes[parentNodeId].supportChildren.push(operation.id);
        opNode.supportParents.push(parentNodeId);
      }
    }
  }
  #getCurrentColParent(lastOp, colName) {
    const operationNode = this.#nodes[lastOp.id];
    if (!operationNode || !Array.isArray(operationNode.parents)) {
      return null;
    }
    for (const parent of operationNode.parents) {
      const currentParent = this.#getOpById(parent);
      // "root" is a virtual node with no matching operation record
      if (currentParent && currentParent.columnName === colName) {
        return currentParent;
      }
    }
    return null;
  }
  #getOpById(id) {
    return this.#operations.find((operation) => operation.id === id);
  }
  #updateLastOp(operation) {
    if (!this.#columns[operation.columnName]) {
      // Column was not explicitly initialized (e.g. a pre-save historical op);
      // create a minimal entry so subsequent lookups don't crash.
      this.#columns[operation.columnName] = {
        type: "original",
        lastOpId: null,
      };
    }
    this.#columns[operation.columnName].lastOpId = operation.id;
  }

  buildDependencyGraph() {
    this.#nodes = {
      root: {
        children: [],
        parents: [],
        supportChildren: [],
        supportParents: [],
      },
    };
    const sortedOps = this.#operations.sort((a, b) => a.opNumber - b.opNumber);
    // console.log("SORTED OPS:", sortedOps);
    for (const operation of sortedOps) {
      this.#appendOperationNode(operation);
    }
  }
  getObject() {
    return {
      datasetId: this.datasetId,
      tableId: this.tableId,
      columns: this.#columns,
      operationsCount: this.#operations.length,
      latestTableData: this.#tableData,
      nodes: this.#nodes,
      operations: this.#operations,
    };
  }
  // Add a toString for basic string coercion
  toString() {
    return `Log(dataset=${this.datasetId}, table=${this.tableId}, ops=${this.#operations.length})`;
  }

  // Make console.log / util.inspect print a custom, readable object.
  [util.inspect.custom]() {
    return {
      datasetId: this.datasetId,
      tableId: this.tableId,
      columns: this.#columns,
      operationsCount: this.#operations.length,
      latestTableData: this.#tableData,
      nodes: JSON.stringify(this.#nodes),
      // include a small preview of operations
      operations: JSON.stringify(this.#operations),
    };
  }

  /**
   * Get all downstream dependency IDs for a given operation ID.
   * Traverses both primary (children) and support (supportChildren) edges
   * recursively. The given opId itself is NOT included in the result.
   *
   * NOTE: buildDependencyGraph() must be called before this method.
   *
   * @param {string} opId - The operation ID to start from
   * @returns {string[]} - Array of all downstream operation IDs
   */
  getDownstreamDependencies(opId) {
    const visited = new Set();
    const queue = [
      ...(this.#nodes[opId]?.children ?? []),
      ...(this.#nodes[opId]?.supportChildren ?? []),
    ];
    const result = [];

    while (queue.length > 0) {
      const id = queue.shift();
      if (visited.has(id) || id === "root") continue;
      visited.add(id);
      result.push(id);

      const node = this.#nodes[id];
      if (node) {
        [...(node.children ?? []), ...(node.supportChildren ?? [])].forEach(
          (child) => {
            if (!visited.has(child) && child !== "root") queue.push(child);
          },
        );
      }
    }

    return result;
  }

  /**
   * Delete all non-consolidated operations from the log file.
   * Non-consolidated operations are those logged after the last SAVE_TABLE,
   * meaning they were never committed to a saved state.
   *
   * This method is intended to be called only on table load so that
   * uncommitted history is pruned once the table is fetched.
   */
  pruneNonConsolidated() {
    if (this.#nonConsolidatedIds.length > 0) {
      this.deleteOperationsFromLog(this.#nonConsolidatedIds);
    }
  }

  /**
   * Remove a set of operations from the .jsonl log file by their IDs.
   * Lines whose `id` field matches any entry in opIds are dropped.
   * The schema entry (first line, no `id`) is always preserved.
   * Also removes matching lines from the companion plain-text .log file,
   * matched by the ISO timestamp embedded in each line.
   *
   * @param {string[]} opIds - Array of operation IDs to remove
   */
  deleteOperationsFromLog(opIds) {
    const logFilePath = `public/logs/logs-${this.datasetId}-${this.tableId}.jsonl`;
    if (!fs.existsSync(logFilePath)) return;

    const idSet = new Set(opIds);
    const lines = fs.readFileSync(logFilePath, "utf-8").split(/\r?\n/);

    // Collect the timestamps of every op we are about to remove so we can
    // mirror the deletion in the plain-text .log file.
    const removedTimestamps = new Set();
    lines.forEach((line) => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        if (parsed.id && idSet.has(parsed.id) && parsed.timestamp) {
          removedTimestamps.add(parsed.timestamp);
        }
      } catch {
        // ignore
      }
    });

    const kept = lines.filter((line) => {
      if (!line.trim()) return false;
      try {
        const { id } = JSON.parse(line);
        return !(id && idSet.has(id));
      } catch {
        return true; // keep schema entry and any non-parseable lines
      }
    });

    fs.writeFileSync(logFilePath, kept.join("\n") + "\n");

    // Mirror deletions in the plain-text .log file.
    if (removedTimestamps.size > 0) {
      this.#deleteFromPlainLog(removedTimestamps);
    }
  }

  /**
   * Remove lines from the plain-text .log file whose embedded ISO timestamp
   * matches any entry in the provided set.
   *
   * Each .log line starts with `[ISO_TIMESTAMP]`, e.g.:
   *   [2025-01-15T10:23:45.123Z] -| OpType: RECONCILIATION ...
   *
   * @param {Set<string>} timestamps - ISO timestamp strings to remove
   * @private
   */
  #deleteFromPlainLog(timestamps) {
    const plainLogPath = `public/logs/logs-${this.datasetId}-${this.tableId}.log`;
    if (!fs.existsSync(plainLogPath)) return;

    const lines = fs.readFileSync(plainLogPath, "utf-8").split(/\r?\n/);
    const kept = lines.filter((line) => {
      if (!line.trim()) return false;
      // Extract the timestamp from the opening bracket: [timestamp]
      const m = line.match(/^\[([^\]]+)\]/);
      if (!m) return true; // keep lines with unexpected format
      return !timestamps.has(m[1]);
    });

    fs.writeFileSync(plainLogPath, kept.join("\n") + (kept.length ? "\n" : ""));
  }
}
