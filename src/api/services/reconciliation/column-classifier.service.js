import { existsSync } from "fs";
import { execSync, spawn } from "child_process";
import path from "path";
import { readFile, writeFile } from "fs/promises";

import FileSystemService from "../datasets/datasets.service.js";
import config from "../../../config/index.js";

const __dirname = path.resolve();
const PYTHON_PATH = "python3";
const SCRIPT_PATH = path.join(
  __dirname,
  "py-scripts/column_classifier_runner.py",
);

const {
  helpers: { getTablesDbPath },
} = config;

class ColumnClassifierService {
  static async ensurePythonEnv() {
    const venvPath = path.join(path.resolve(), "venv");

    if (!existsSync(venvPath)) {
      console.log(
        "[Python Setup] Virtual environment not found. Creating it...",
      );
      execSync(
        "python3 -m venv venv && ./venv/bin/pip install --upgrade pip setuptools wheel && ./venv/bin/pip install pandas spacy column-classifier && ./venv/bin/python -m spacy download en_core_web_sm",
      );
      console.log("[Python Setup] Environment ready.");
    }
  }

  static async annotate({ idDataset, idTable, io }) {
    await this.setSchemaStatus(idTable, "PENDING");
    console.log(
      `[annotate] Launching classifier for dataset ${idDataset}, table ${idTable}`,
    );
    this.runClassifier({ idDataset, idTable, io });
  }

  static async runClassifier({ idDataset, idTable, io }) {
    try {
      await this.ensurePythonEnv();
      const PYTHON_PATH = path.join(path.resolve(), "venv", "bin", "python3");
      const table = await FileSystemService.findTable(idDataset, idTable);
      const formattedColumns = {};
      for (const colName of Object.keys(table.columns)) {
        const cleanName = colName.replace(/^\uFEFF/, "");
        formattedColumns[cleanName] = Object.values(table.rows).map(
          (row) => row.cells[colName]?.label ?? "",
        );
      }

      const py = spawn(PYTHON_PATH, [SCRIPT_PATH]);
      let stdout = "";
      let stderr = "";
      let finished = false;

      const finish = async (status, result = null) => {
        if (finished) return;
        finished = true;

        try {
          await this.setSchemaStatus(idTable, "DONE");
          const tableData = await FileSystemService.findTable(
            idDataset,
            idTable,
          );
          io?.emit("schema-done", {
            table: tableData.table,
            result,
          });

          console.log(
            `[finish] Emitted schema-done patch for table ${idTable}`,
          );
        } catch (err) {
          console.error("[finish] Error emitting schema-done:", err);
        }
      };

      py.stdout.on("data", (d) => {
        stdout += d.toString();
        console.log("[Python stdout chunk]:", d.toString());
      });

      py.stderr.on("data", (d) => {
        stderr += d.toString();
        console.error("[Python stderr chunk]:", d.toString());
      });

      py.on("close", async (code) => {
        console.log(`[runClassifier] Python process closed with code ${code}`);
        if (code !== 0) {
          console.error(
            "[runClassifier] Python process returned error:",
            stderr,
          );
          return finish("ERROR");
        }

        try {
          const result = JSON.parse(stdout);
          console.log("[runClassifier] Parsed Python result:", result);
          await this.applyResult(idDataset, idTable, result);
          await finish("DONE", result);
        } catch (err) {
          console.error(
            "[runClassifier] Error parsing Python output:",
            err,
            stdout,
          );
          await finish("ERROR");
        }
      });

      py.on("error", async (err) => {
        console.error("[runClassifier] Python spawn error:", err);
        await finish("ERROR");
      });

      console.log("[runClassifier] Sending input to Python...");
      py.stdin.write(JSON.stringify({ columns: formattedColumns }));
      py.stdin.end();
    } catch (err) {
      console.error("[runClassifier] ColumnClassifier crashed:", err);
      await this.setSchemaStatus(idTable, "DONE");
      io?.emit("schema-done", {
        datasetId: idDataset,
        tableId: idTable,
        status: "ERROR",
      });
    }
  }

  static async applyResult(idDataset, idTable, result) {
    const tableData = await FileSystemService.findTable(idDataset, idTable);
    const { table, columns, rows, columnOrder } = tableData;

    const updatedColumns = {};
    const columnIdMap = {};

    Object.entries(columns).forEach(([oldId, col]) => {
      const cleanId = oldId.replace(/^\uFEFF/, "").trim();
      columnIdMap[oldId] = cleanId;

      updatedColumns[cleanId] = {
        ...col,
        id: cleanId,
        label: col.label?.replace(/^\uFEFF/, "").trim() ?? cleanId,
        kind: result.kind_classification?.[cleanId] ?? col.kind ?? "unknown",
        nerClassification:
          result.ner_classification?.[cleanId] ??
          col.nerClassification ??
          "unknown",
      };
    });

    const updatedRows = {};
    Object.entries(rows).forEach(([rowId, row]) => {
      const newCells = {};
      Object.entries(row.cells).forEach(([oldColId, cell]) => {
        const cleanColId = columnIdMap[oldColId] ?? oldColId;
        newCells[cleanColId] = cell;
      });

      updatedRows[rowId] = {
        ...row,
        cells: newCells,
      };
    });

    await FileSystemService.updateTable({
      tableInstance: table,
      columns: {
        byId: updatedColumns,
        allIds: Object.keys(updatedColumns),
      },
      rows: {
        byId: updatedRows,
        allIds: Object.keys(updatedRows),
      },
      columnOrder,
    });

    console.log(`[applyResult] Table ${idTable} updated successfully in DB`);
  }

  static async setSchemaStatus(idTable, status) {
    console.log(
      `[setSchemaStatus] Updating table ${idTable} status to ${status}`,
    );
    const dbPath = getTablesDbPath();
    const { meta, tables } = JSON.parse(await readFile(dbPath));

    tables[idTable] = {
      ...tables[idTable],
      schemaStatus: status,
      lastModifiedDate: new Date().toISOString(),
    };

    await writeFile(dbPath, JSON.stringify({ meta, tables }, null, 2));
  }
}

export default ColumnClassifierService;
