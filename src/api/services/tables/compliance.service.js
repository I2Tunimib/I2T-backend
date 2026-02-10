import { readFile, writeFile } from "fs/promises";
import OpenAI from "openai";
import FileSystemService from "../datasets/datasets.service.js";
import config from "../../../config/index.js";
import LLMColumnClassifierService from "../reconciliation/llm-column-classifier.service.js";
import { extractLLMJson } from "../../../utils/dataUtils.js";

const {
  helpers: { getTablesDbPath },
} = config;

// Helper to sanitize strings for LLM
function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/[^\x00-\xff]/g, "?");
}

class ComplianceService {
  /**
   * 1. ENTRY POINT
   */
  static async startCompliance({ idDataset, idTable, purpose, io }) {
    await this.setStatus(idTable, "PENDING");
    this.makeCompliance({ idDataset, idTable, purpose, io });
  }

  /**
   * 2. MAIN OPERATION - Calls LLM for GDPR compliance check
   */
  static async makeCompliance({ idDataset, idTable, purpose, io }) {
    try {
      // Get table data
      const table = await FileSystemService.findTable(idDataset, idTable);

      // Prepare data for LLM
      const tableData = this.prepareTableData(table);

      // Build GDPR compliance prompt
      const prompt = this.buildGDPRPrompt(tableData, purpose);

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: latin1Safe(
          process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
        ),
        baseURL: process.env.LLM_ADDRESS || "",
      });

      // Call LLM
      const model = process.env.LLM_MODEL || "gpt-4";
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a GDPR compliance expert. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent/deterministic results
        max_tokens: 4000, // Ensure enough tokens for complete response with all columns
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        console.error("[makeCompliance] Empty response from LLM");
        await this.finishWithError({ idDataset, idTable, io });
        return;
      }

      // Parse JSON response
      const result = extractLLMJson(raw);
      if (!result) {
        console.error(
          "[makeCompliance] Failed to parse JSON from LLM response",
        );
        await this.finishWithError({ idDataset, idTable, io });
        return;
      }

      // Update table with compliance results
      // Ensure result is an array - wrap if necessary
      let finalResult = result;
      if (!Array.isArray(result)) {
        console.log(
          "[makeCompliance] Result is not an array, wrapping it in array",
        );
        finalResult = [result];
      }

      // Validate structure - first element should have 'table' property
      if (!finalResult[0]?.table) {
        console.error(
          "[makeCompliance] Invalid structure: first element missing 'table' property",
        );
        await this.finishWithError({ idDataset, idTable, io });
        return;
      }

      // Update table with compliance results
      await this.applyResult(idDataset, idTable, finalResult);

      // Finish successfully
      await this.finish({ idDataset, idTable, io, result: finalResult });
    } catch (err) {
      console.error("[makeCompliance] Error:", err);
      await this.setStatus(idTable, "ERROR");
      io?.emit("compliance-done", {
        datasetId: idDataset,
        tableId: idTable,
        status: "ERROR",
        error: err.message,
      });
    }
  }

  /**
   * 3. PREPARE TABLE DATA
   */
  static prepareTableData(table) {
    const columnNames = Object.keys(table.columns.byId || table.columns);
    const allRows = Object.values(table.rows.byId || table.rows);

    // Random sampling: take at most 5 samples if available
    const sampleSize = Math.min(5, allRows.length);
    const sampleRows = this.getRandomSample(allRows, sampleSize);

    return {
      tableName: table.table?.name || "Unnamed Table",
      columnCount: columnNames.length,
      rowCount: allRows.length,
      columns: columnNames,
      sampleData: sampleRows.map((row) => {
        const cells = {};
        columnNames.forEach((col) => {
          cells[col] = row.cells[col]?.label || "";
        });
        return cells;
      }),
    };
  }

  /**
   * Helper: Get random sample from array without replacement
   */
  static getRandomSample(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  /**
   * 4. BUILD GDPR COMPLIANCE PROMPT
   */
  static buildGDPRPrompt(tableData, purpose = "General data processing") {
    const tableJson = JSON.stringify(tableData.sampleData, null, 2);
    const columnsInfo = `Columns: ${tableData.columns.join(", ")}`;

    return latin1Safe(`
Given the specified purpose, determine if the csv table below is GDPR compliant.

Assess whether it contains personal data (Art. 4 GDPR).

Evaluate if one or more columns:
- Directly identify a natural person (personalData)
  (e.g., name, email, phone, tax ID, user ID, IP address, etc.)
- Indirectly identify a person through combinations (quasiIdentifiers)
  (e.g., age + location + role, timestamp + location, etc.)

Determine if the table is:
- noGDPR: outside the scope of GDPR (truly anonymous data)
- yesGDPR: subject to GDPR
- pseudoGDPR: pseudonymized but not anonymous (GDPR still applies)

Provide reasoning for the decision and a confidence score.

Classify each column as:
- personalData
- quasiIdentifiers
- nonPersonalData
- anonymousData (if already anonymous)

For each column, suggest what action to take to make the table compliant, using three options: "noChange", "remove", "pseudonymize"

For each column, provide reasoning for the decision and a confidence score.

The response must be in JSON format with this structure:
[
  {
    "table": {
      "gdpr": "yesGDPR",
      "reasoning": "...",
      "score": 0.95,
      "sourceTable": "${tableData.tableName}"
    }
  },
  {
    "column_name_1": {
      "classification": "personalData",
      "action": "pseudonymize",
      "reasoning": "...",
      "score": 0.90
    }
  }
]

Purpose: ${purpose}

Table Information:
- Table Name: ${tableData.tableName}
- ${columnsInfo}
- Total Rows: ${tableData.rowCount}
- Sample Size: ${tableData.sampleData.length} rows

Table:
${tableJson}

IMPORTANT: Return ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
`);
  }

  /**
   * 5. APPLY RESULT - Save entire compliance result in one field
   */
  static async applyResult(idDataset, idTable, result) {
    const tableData = await FileSystemService.findTable(idDataset, idTable);
    const { table, columns, rows, columnOrder } = tableData;
    // Save the entire compliance result in one field
    const updatedTable = {
      ...table,
      compliance: result, // Store the full array from LLM
      lastModifiedDate: new Date().toISOString(),
    };

    // Ensure columns and rows are in the correct format for updateTable
    // updateTable expects { byId: {}, allIds: [] } structure
    const columnsFormatted = {
      byId: columns,
      allIds: Object.keys(columns),
    };

    const rowsFormatted = {
      byId: rows,
      allIds: Object.keys(rows),
    };

    await FileSystemService.updateTable({
      tableInstance: updatedTable,
      columns: columnsFormatted,
      rows: rowsFormatted,
      columnOrder,
    });
  }

  /**
   * 6. STATUS MANAGEMENT
   */
  static async setStatus(idTable, status) {
    const dbPath = getTablesDbPath();
    const { meta, tables } = JSON.parse(await readFile(dbPath));

    tables[idTable] = {
      ...tables[idTable],
      complianceStatus: status,
      lastModifiedDate: new Date().toISOString(),
    };

    await writeFile(dbPath, JSON.stringify({ meta, tables }, null, 2));
  }

  /**
   * 7. FINISH HANDLERS
   */
  static async finish({ idDataset, idTable, io, result }) {
    await this.setStatus(idTable, "DONE");
    const tableData = await FileSystemService.findTable(idDataset, idTable);

    io?.emit("compliance-done", {
      datasetId: idDataset,
      tableId: idTable,
      table: tableData.table,
      status: "DONE",
      result,
    });
  }

  static async finishWithError({ idDataset, idTable, io }) {
    await this.setStatus(idTable, "ERROR");
    io?.emit("compliance-done", {
      datasetId: idDataset,
      tableId: idTable,
      status: "ERROR",
    });
  }
}

export default ComplianceService;
