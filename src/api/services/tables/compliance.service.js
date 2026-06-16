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
  static getServiceMetadata() {
    return {
      id: "gdpr-compliance-check",
      name: "GDPR",
      group: "Compliance",
      description: `
      <div>
        <p>
          An LLM-based service designed to evaluate the current state of a table's compliance with regulatory frameworks.
          By analyzing data samples and column headers through the lens of a specified processing purpose, the system
          determines whether the dataset falls under the scope of GDPR.
        </p>

        <p style="margin-top: 10px;">
          <strong>Input</strong>: The current table and a description of the data processing purpose.<br />
          <strong>Output</strong>: A table overview (summary of GDPR status and confidence) and a detailed column analysis
          (classification, suggested action, reasoning).
        </p>

        <p style="margin-top: 10px;">The possible table GDPR statuses include:</p>
        <ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 10px;">
          <li><strong>noGDPR</strong>: The table contains no personal data and is outside the scope of GDPR.</li>
          <li><strong>yesGDPR</strong>: The table contains identifiable personal data and is subject to GDPR requirements.</li>
          <li><strong>pseudoGDPR</strong>: The table contains pseudonymized data; GDPR still applies, but the risk is reduced.</li>
        </ul>

        <p>Column classifications:</p>
        <ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 10px;">
          <li><strong>personalData</strong>: Directly identifies an individual (e.g., name, email).</li>
          <li><strong>quasiIdentifiers</strong>: Could indirectly identify a person when combined with other data.</li>
          <li><strong>nonPersonalData</strong>: Organizational or contextual information.</li>
          <li><strong>anonymousData</strong>: Fully anonymized data.</li>
        </ul>

        <p>Suggested actions:</p>
        <ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 10px;">
          <li><strong>noChange</strong>: Data is already compliant.</li>
          <li><strong>pseudonymize</strong>: Replace identifying values with pseudonyms or hashes.</li>
          <li><strong>generalize</strong>: Reduce data specificity (e.g., exact dates to years).</li>
          <li><strong>remove</strong>: Delete the column if unnecessary for the specified purpose.</li>
        </ul>

        PLACEHOLDER_COMPLIANCE_GIF
      </div>
    `,
    };
  }
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
      console.log("TableData", tableData);
      // Build GDPR compliance prompt
      const prompt = this.buildGDPRPrompt(tableData, purpose);
      console.log("prompt", prompt);
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
      console.log("raw compliance results", raw);
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

      // Normalize format in case LLM returned { column_name: "...", classification: "..." }
      finalResult = this.normalizeResult(finalResult);

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
   * 2b. NORMALIZE RESULT - Convert wrong LLM format to expected format
   * Handles: { "column_name": "Foo", "classification": "..." }
   * Converts to: { "Foo": { "classification": "..." } }
   */
  static normalizeResult(result) {
    return result.map((item) => {
      // Element 0 (table summary) is always correct — leave as-is
      if (item.table) return item;

      const keys = Object.keys(item);
      // Already in correct format: single key whose value is an object with classification
      if (
        keys.length === 1 &&
        item[keys[0]] &&
        typeof item[keys[0]] === "object" &&
        "classification" in item[keys[0]]
      ) {
        return item;
      }

      // Wrong format: { column_name: "Foo", classification: "...", action: "...", ... }
      //           or: { name: "Foo", classification: "...", action: "...", ... }
      const nameKey =
        "column_name" in item ? "column_name" : "name" in item ? "name" : null;
      if (nameKey) {
        const columnName = item[nameKey];
        const { column_name, name, ...rest } = item;
        console.log(
          `[normalizeResult] Converting wrong format for column: ${columnName}`,
        );
        return { [columnName]: rest };
      }

      // Unknown shape — return as-is
      return item;
    });
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

    return `
Given the specified purpose, determine if the csv table below is GDPR compliant.

Assess whether it contains personal data (Art. 4 GDPR).

IMPORTANT: Carefully examine both the column names AND the actual data values to determine if data has already been pseudonymized or anonymized:

Examples of ALREADY PSEUDONYMIZED/ANONYMIZED data (action should be "noChange"):
- Names: "USR_12345", "a3f8d9e2", "Patient_042", "User_XYZ789" instead of "John Smith"
- Hashed values: "5d41402abc4b2a76b9719d911017c592", long alphanumeric strings
- Column names suggesting pseudonymization: "user_id", "hash", "code", "pseudonym", "anonymized_name", "identifier"
- Location with reduced precision:
  * Coordinates: "45.46, 9.19" (2 decimals ~1km precision) instead of "45.464203, 9.191383" (full precision ~10m)
  * Only city/country level: "Milan, Italy" instead of full street addresses
- Dates/timestamps truncated: "2024", "2024-01", "Q1 2024" instead of "2024-01-15 14:32:05"
- Aggregated age ranges: "30-40" instead of exact age "35"
- Encoded/obfuscated data: incomprehensible strings, masked values (e.g., "***-**-1234" for IDs)
- K-anonymity: data generalized to ensure at least k individuals share the same characteristics

Examples of PERSONAL DATA that needs action:
- Full names: "John Smith", "Maria Garcia"
- Email addresses: "john.smith@example.com"
- Phone numbers: "+39 123 456 7890"
- Precise coordinates: "45.464203, 9.191383" (6+ decimals)
- Full addresses: "Via Roma 123, 20100 Milano"
- Exact timestamps with person context: "2024-01-15 14:32:05" when combined with user activity

If data is ALREADY pseudonymized or anonymized, classify it as "anonymousData" or "nonPersonalData" with action "noChange".

Evaluate if one or more columns:
- Directly identify a natural person (personalData)
  (e.g., full name, email, phone, tax ID, precise address, IP address, etc.)
- Indirectly identify a person through combinations (quasiIdentifiers)
  (e.g., age + location + role, timestamp + location, etc.)
- Are already pseudonymized but could still identify someone with additional data (pseudoGDPR)
- Are truly anonymous and cannot identify anyone (noGDPR)

Determine if the table is:
- noGDPR: outside the scope of GDPR (truly anonymous data, already properly anonymized)
- yesGDPR: subject to GDPR (contains identifiable personal data)
- pseudoGDPR: pseudonymized but not anonymous (GDPR still applies but reduced risk)

Provide reasoning for the decision and a confidence score.

Classify each column as:
- personalData (direct identifiers that need action)
- quasiIdentifiers (indirect identifiers that may need action)
- nonPersonalData (organizational or non-identifying data)
- anonymousData (already properly anonymized or truly anonymous)

For each column, suggest what action to take to make the table compliant, using three options:
- "noChange": if data is already compliant (anonymized, pseudonymized, or non-personal)
- "remove": if the data is identifiable and not needed for the purpose
- "pseudonymize": if the data is identifiable but needed and can be pseudonymized

For each column, provide reasoning for the decision and a confidence score.

The response must be a JSON array where:
- Element [0] is the table-level summary with key "table"
- Each subsequent element is a single-key object where THE KEY IS THE EXACT COLUMN NAME (not a property called "column_name")

CRITICAL FORMAT RULE: For column entries, the column name MUST be the JSON object key, not a value. Do NOT use a "column_name" property.

Correct format (column name as key):
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
    "<exact column name here>": {
      "classification": "personalData",
      "action": "pseudonymize",
      "reasoning": "...",
      "score": 0.90
    }
  }
]

WRONG format (never use this):
{ "column_name": "Football Club", "classification": "nonPersonalData", ... }

For the columns in this table (${tableData.columns.join(", ")}), element [1] must look like:
{ "${tableData.columns[0]}": { "classification": "...", "action": "...", "reasoning": "...", "score": 0.0 } }

Purpose: ${purpose}

Table Information:
- Table Name: ${tableData.tableName}
- ${columnsInfo}
- Total Rows: ${tableData.rowCount}
- Sample Size: ${tableData.sampleData.length} rows

Table:
${tableJson}

IMPORTANT: Return ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
`;
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
