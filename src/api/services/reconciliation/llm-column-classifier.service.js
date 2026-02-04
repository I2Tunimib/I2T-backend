import path from "path";
import { readFile, writeFile } from "fs/promises";
import OpenAI from "openai";

import FileSystemService from "../datasets/datasets.service.js";
import config from "../../../config/index.js";

const __dirname = path.resolve();

const ENTITY_TYPES = {
  PERSON: true,
  LOCATION: true,
  ORGANIZATION: true,
  OTHER: true,
};
const LITERAL_TYPES = { NUMBER: true, DATE: true, STRING: true };

function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-") // replace hyphens/dashes
    .replace(/[^\x00-\xff]/g, (c) => "?"); // drop remaining non‑Latin‑1
}

/**
 * LLM-based Column Classifier Service
 *
 * Behaviour:
 * - Mirrors the behavior of the python-based column classifier:
 *   it reads the table, prepares a sample of column values, calls an LLM to
 *   classify each column into a NER-like class and a kind (entity|literal|unknown)
 * - Emits the same "schema-done" event payload and updates the table columns
 *   with `kind` and `nerClassification` fields so the frontend receives the same schema update.
 */
class LLMColumnClassifierService {
  static async annotate({ idDataset, idTable, io }) {
    await this.setSchemaStatus(idTable, "PENDING");
    console.log(
      `[LLM annotate] Launching LLM classifier for dataset ${idDataset}, table ${idTable}`,
    );
    this.runClassifier({ idDataset, idTable, io });
  }

  static async runClassifier({ idDataset, idTable, io }) {
    try {
      const table = await FileSystemService.findTable(idDataset, idTable);

      // Build columns => sample values mapping
      const formattedColumns = {};
      for (const colName of Object.keys(table.columns)) {
        const cleanName = colName.replace(/^\uFEFF/, "");
        // take up to first 25 values (or fewer) to keep prompts reasonable
        const allVals = Object.values(table.rows).map(
          (row) => row.cells[colName]?.label ?? "",
        );
        const sample = allVals.slice(0, 25);
        formattedColumns[cleanName] = sample;
      }

      // Build prompt that asks the LLM to return JSON with the same shape as the python classifier
      const prompt = this.buildPrompt(formattedColumns);

      // Prepare OpenAI client (consistent with other LLM usages in the codebase)
      const openai = new OpenAI({
        apiKey: latin1Safe(
          process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
        ), // prefer env LLM_KEY or OPENAI_API_KEY
        baseURL: process.env.LLM_ADDRESS || "",
      });

      console.log(
        "[LLM runClassifier] Sending prompt to LLM (truncated):",
        prompt.slice(0, 1000),
      );

      const model = process.env.LLM_MODEL || "phi4-mini";
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        console.error("[LLM runClassifier] Empty response from LLM");
        await this.finishWithError({ idDataset, idTable, io });
        return;
      }

      const parsed = this.extractJson(raw);
      if (!parsed || typeof parsed !== "object") {
        console.error(
          "[LLM runClassifier] Failed to parse JSON from LLM response. Raw:",
          raw,
        );
        await this.finishWithError({ idDataset, idTable, io });
        return;
      }

      // Expecting the LLM to return: { ner_classification: {...}, kind_classification: {...} }
      console.log("[LLM runClassifier] Parsed LLM result:", parsed);

      await this.applyResult(idDataset, idTable, parsed);

      await this.finish({ idDataset, idTable, io, result: parsed });
    } catch (err) {
      console.error("[LLM runClassifier] Error:", err);
      await this.setSchemaStatus(idTable, "DONE");
      io?.emit("schema-done", {
        datasetId: idDataset,
        tableId: idTable,
        status: "ERROR",
      });
    }
  }

  static buildPrompt(formattedColumns) {
    // Build a readable prompt listing each column and some sample values.
    // Instruct the model to respond with a strict JSON object matching the python classifier output.
    const examples = Object.entries(formattedColumns)
      .map(([col, vals]) => {
        const safeVals = vals.map((v) =>
          v?.toString().replace(/\n/g, " ").slice(0, 200),
        );
        return `"${col}": [${safeVals.map((v) => JSON.stringify(v)).join(", ")}]`;
      })
      .join("\n");

    return latin1Safe(`
You are given a set of table columns with sample cell values. For each column, classify its semantic type (NER-like)
using the following allowed NER types only: PERSON, LOCATION, ORGANIZATION, OTHER, NUMBER, DATE, STRING.

Then, for each column, also provide a "kind" value which must be one of: "entity", "literal", "unknown".
The mapping rules are:
- If NER is one of PERSON, LOCATION, ORGANIZATION, OTHER -> kind should be "entity"
- If NER is one of NUMBER, DATE, STRING -> kind should be "literal"
- Otherwise -> kind should be "unknown"

Important:
- Return ONLY a single JSON object and nothing else.
- The JSON MUST have exactly these two keys at the top level: "ner_classification" and "kind_classification".
- Each of those must be an object mapping column label -> classification string.
- Example valid response:
{
  "ner_classification": {
    "name": "PERSON",
    "birthdate": "DATE",
    "salary": "NUMBER",
    "city": "LOCATION"
  },
  "kind_classification": {
    "name": "entity",
    "birthdate": "literal",
    "salary": "literal",
    "city": "entity"
  }
}

Columns and sample values:
${examples}

Only use the allowed NER labels and the allowed kind values. If you're unsure, use "UNKNOWN" (for NER) and "unknown" (for kind).
Make sure keys match the column names exactly as provided above.
`);
  }

  // Extracts a JSON object embedded in free-form text (handles code fences)
  static extractJson(input) {
    try {
      const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
      const fenceMatch = input.match(fenceRegex);
      let candidate = fenceMatch ? fenceMatch[1].trim() : input.trim();

      const firstBrace = candidate.indexOf("{");

      if (firstBrace === -1) {
        throw new Error("No JSON object found in response");
      }

      // Try to parse with balanced braces instead of just finding last }
      let braceCount = 0;
      let lastValidBrace = -1;

      for (let i = firstBrace; i < candidate.length; i++) {
        if (candidate[i] === "{") {
          braceCount++;
        } else if (candidate[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            lastValidBrace = i;
            break; // Found the matching closing brace
          }
        }
      }

      if (lastValidBrace === -1) {
        throw new Error("No matching closing brace found");
      }

      const jsonStr = candidate.slice(firstBrace, lastValidBrace + 1);
      console.log("[LLM extractJson] Attempting to parse:", jsonStr);
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error("[LLM extractJson] Invalid JSON string:", err.message);
      console.error("[LLM extractJson] Raw response:", input);
      return null;
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

    console.log(
      `[LLM applyResult] Table ${idTable} updated successfully in DB`,
    );
  }

  static async setSchemaStatus(idTable, status) {
    console.log(
      `[LLM setSchemaStatus] Updating table ${idTable} status to ${status}`,
    );
    const dbPath = config.helpers.getTablesDbPath();
    const { meta, tables } = JSON.parse(await readFile(dbPath));

    tables[idTable] = {
      ...tables[idTable],
      schemaStatus: status,
      lastModifiedDate: new Date().toISOString(),
    };

    await writeFile(dbPath, JSON.stringify({ meta, tables }, null, 2));
  }

  static async finish({ idDataset, idTable, io, result = null }) {
    try {
      await this.setSchemaStatus(idTable, "DONE");
      const tableData = await FileSystemService.findTable(idDataset, idTable);
      io?.emit("schema-done", {
        table: tableData.table,
        result,
      });

      console.log(
        `[LLM finish] Emitted schema-done patch for table ${idTable}`,
      );
    } catch (err) {
      console.error("[LLM finish] Error emitting schema-done:", err);
    }
  }

  static async finishWithError({ idDataset, idTable, io }) {
    try {
      await this.setSchemaStatus(idTable, "DONE");
      io?.emit("schema-done", {
        datasetId: idDataset,
        tableId: idTable,
        status: "ERROR",
      });
    } catch (err) {
      console.error(
        "[LLM finishWithError] Error emitting error schema-done:",
        err,
      );
    }
  }
}

export default LLMColumnClassifierService;
