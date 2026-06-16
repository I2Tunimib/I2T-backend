/**
 * semtparser.service.js
 *
 * Pure-JS replacement for the semTParser Rust binary.
 * Uses the Log class and its dependency DAG to generate Python scripts
 * or Jupyter notebooks that reproduce a saved table-enrichment session.
 *
 * Key improvements over the old binary:
 *  - Reads the .jsonl log directly — no .txt needed
 *  - Uses the DAG's support-parent info to identify cross-column dependencies
 *  - Generates dynamic dict comprehensions for row-keyed support columns
 *    (e.g. the `dates` param for meteoPropertiesOpenMeteo) instead of
 *    hardcoding the values captured at log time
 *  - Deduplication mirrors the Rust process_operations logic
 */

import fs from "fs";
import { randomUUID } from "crypto";
import { Log } from "../logger/Log.js";

// ---------------------------------------------------------------------------
// Service config loader — reads each extender/modifier's index.js to get
// its formParams so we know exactly what keys to include and how to treat them.
// This replaces every hardcoded SKIP_KEYS / special-case list.
// ---------------------------------------------------------------------------

function loadServiceConfig(serviceId) {
  const categories = ["extenders", "modifiers", "reconcilers"];
  for (const category of categories) {
    const filePath = `${process.cwd()}/src/services/${category}/${serviceId}/index.js`;
    if (!fs.existsSync(filePath)) continue;
    try {
      const src = fs.readFileSync(filePath, "utf-8");
      const objSrc = src
        .replace(/^\s*export\s+default\s+/, "")
        .replace(/;\s*$/, "");
      // Eval with the real `process` so env-var references resolve cleanly
      return new Function("process", `return (${objSrc})`)(process);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Returns a Map of  paramId → inputType  for every formParam the service
 * declares, plus a Set of param IDs that are row-keyed (selectColumns /
 * multipleColumnSelect) and therefore need dynamic table_data code.
 */
function getFormParamMeta(config) {
  const paramTypes = new Map(); // id → inputType
  const rowKeyedIds = new Set(); // ids that need dynamic dict comprehensions

  for (const p of config?.public?.formParams ?? []) {
    paramTypes.set(p.id, p.inputType);
    if (
      p.inputType === "selectColumns" ||
      p.inputType === "multipleColumnSelect"
    ) {
      rowKeyedIds.add(p.id);
    }
  }
  return { paramTypes, rowKeyedIds };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect a flat row-keyed column-data object:
 *   { r0: [value, [], colName], r1: [...], ... }
 */
function isRowKeyedData(val) {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const entries = Object.entries(val);
  if (entries.length === 0) return false;
  return entries.every(
    ([k, v]) =>
      /^r\d+$/.test(k) &&
      Array.isArray(v) &&
      v.length === 3 &&
      typeof v[2] === "string",
  );
}

/** Extract the support column name from the first row of a row-keyed object. */
function colNameFromRowKeyed(rowKeyed) {
  return Object.values(rowKeyed)[0][2];
}

/**
 * Detect a two-level row-keyed object used in modification/reconciliation:
 *   { colName: { r0: [value, [], colName], r1: [...] }, ... }
 */
function isTwoLevelRowKeyed(val) {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const entries = Object.entries(val);
  if (entries.length === 0) return false;
  return entries.every(([, inner]) => isRowKeyedData(inner));
}

/** Convert a JSON value to its Python literal representation. */
function valueToPython(val) {
  if (val === null || val === undefined) return "None";
  if (val === true) return "True";
  if (val === false) return "False";
  if (typeof val === "number") return String(val);
  if (typeof val === "string")
    return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (Array.isArray(val)) return `[${val.map(valueToPython).join(", ")}]`;
  if (typeof val === "object") {
    const items = Object.entries(val).map(
      ([k, v]) => `"${k}": ${valueToPython(v)}`,
    );
    return `{${items.join(", ")}}`;
  }
  return String(val);
}

/**
 * Read the raw .jsonl to find the last SAVE_TABLE entry in the log window
 * (i.e. the one that closed the current editing session).
 * Returns the parsed object or null.
 */
function getSaveTableInfo(datasetId, tableId) {
  const logFilePath = `public/logs/logs-${datasetId}-${tableId}.jsonl`;
  if (!fs.existsSync(logFilePath)) return null;

  const lines = fs.readFileSync(logFilePath, "utf-8").split(/\r?\n/);
  // scan from the end — find the last SAVE_TABLE
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.operationType === "SAVE_TABLE") return parsed;
    } catch {
      // ignore malformed lines
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Deduplication — mirrors the Rust `process_operations` logic
// ---------------------------------------------------------------------------

/**
 * Apply the same deduplication rules as the Rust semTParser:
 *  - RECONCILIATION: keep only the latest per column unless an EXTENSION
 *    on the same column has been logged in between.
 *  - EXTENSION: skip if identical to the most recent extension for the
 *    same column (same extender + additionalData).
 *  - MODIFICATION: always keep.
 *  - EXPORT: skip consecutive duplicates (same additionalData).
 *  - Everything else: keep.
 */
function processOperations(operations) {
  const sorted = [...operations].sort(
    (a, b) => (a.opNumber ?? 0) - (b.opNumber ?? 0),
  );
  const filtered = [];

  for (const op of sorted) {
    const { operationType: opType, columnName: colName } = op;

    if (opType === "RECONCILIATION") {
      // Find the last reconciliation index for this column
      const lastReconIdx = filtered.reduce(
        (found, o, i) =>
          o.operationType === "RECONCILIATION" && o.columnName === colName
            ? i
            : found,
        -1,
      );

      if (lastReconIdx === -1) {
        filtered.push(op);
      } else {
        const hasExtensionBetween = filtered
          .slice(lastReconIdx + 1)
          .some(
            (o) => o.operationType === "EXTENSION" && o.columnName === colName,
          );
        if (hasExtensionBetween) {
          filtered.push(op);
        } else {
          // Replace the superseded reconciliation with this one
          filtered.splice(lastReconIdx, 1);
          filtered.push(op);
        }
      }
    } else if (opType === "EXTENSION") {
      const extKey = (o) =>
        `${o.columnName}:${o.extender}:${JSON.stringify(o.additionalData)}`;
      const lastOnCol = [...filtered]
        .reverse()
        .find((o) => o.columnName === colName);
      if (
        lastOnCol?.operationType === "EXTENSION" &&
        extKey(op) === extKey(lastOnCol)
      ) {
        continue; // identical extension — skip
      }
      filtered.push(op);
    } else if (opType === "MODIFICATION") {
      filtered.push(op);
    } else if (opType === "EXPORT") {
      const lastExport = [...filtered]
        .reverse()
        .find((o) => o.operationType === "EXPORT");
      if (
        lastExport &&
        JSON.stringify(lastExport.additionalData) ===
          JSON.stringify(op.additionalData)
      ) {
        continue; // identical export — skip
      }
      filtered.push(op);
    } else {
      filtered.push(op);
    }
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Code generators per operation type
// ---------------------------------------------------------------------------

function genReconciliation(op) {
  const colName = op.columnName;
  const reconcilerId = op.reconciler;
  const ad = op.additionalData || {};

  const optCols = Object.keys(ad.additionalColumns || {});
  const optColsPy = optCols.map((c) => `"${c}"`).join(", ");

  // Extra params: prefix + reference column (used by some reconcilers)
  const extraLines = [];
  const extraCallParts = [];
  if (ad.prefix) {
    extraLines.push(`prefix = "${ad.prefix}"`);
    extraCallParts.push(`"prefix": prefix`);
  }
  if (ad.columnToReconcile) {
    const firstEntry = Object.values(ad.columnToReconcile)[0];
    if (Array.isArray(firstEntry) && firstEntry.length >= 3) {
      const refCol = firstEntry[2];
      extraLines.push(`reference_column = "${refCol}"`);
      extraCallParts.push(`"reference_column": reference_column`);
    }
  }

  const extraBlock = extraLines.length > 0 ? extraLines.join("\n") + "\n" : "";
  const extraCall =
    extraCallParts.length > 0
      ? `,\n        extra_params={${extraCallParts.join(", ")}}`
      : "";

  return `${extraBlock}try:
    table_data = table_manager.get_table(dataset_id, table_id)
    reconciled_table, backend_payload = reconciliation_manager.reconcile(
        table_data,
        "${colName}",
        "${reconcilerId}",
        [${optColsPy}],
        dataset_id=dataset_id,
        table_id=table_id${extraCall}
    )
    payload = backend_payload

    successMessage, sentPayload = utility.push_to_backend(
        dataset_id, table_id, payload, debug=False
    )
    print(successMessage)

    html_table = Utility.display_json_table(
        json_table=reconciled_table, number_of_rows=4, from_row=0, labels=["${colName}"]
    )
    if html_table is not None:
        from IPython.display import display
        display(html_table)
except Exception as e:
    print(f"An error occurred during reconciliation: {e}")
`;
}

function genExtension(op) {
  const colName = op.columnName;
  const extenderId = op.extender;
  const ad = op.additionalData || {};

  // Load the service config to know which keys are real params and how to
  // treat them. Keys absent from formParams are metadata (serviceId, tableId,
  // items, useLLM, …) and are silently dropped.
  const config = loadServiceConfig(extenderId);
  const { paramTypes, rowKeyedIds } = getFormParamMeta(config);

  const supportVarLines = [];
  const otherParamsEntries = [];

  for (const [key, val] of Object.entries(ad)) {
    if (!paramTypes.has(key)) continue; // metadata — skip

    if (rowKeyedIds.has(key)) {
      if (paramTypes.get(key) === "multipleColumnSelect") {
        // { colName: { r0: [v, [], col], … } } — rebuild per col from table_data
        const cols = Object.keys(val).map((c) => `"${c}"`);
        supportVarLines.push(
          `    ${key} = {` +
            `col: {row_id: [table_data["rows"][row_id]["cells"][col]["label"], [], col]` +
            ` for row_id in table_data["rows"]}` +
            ` for col in [${cols.join(", ")}]}`,
        );
      } else {
        // selectColumns: { r0: [v, [], colName], … } — rebuild from table_data
        const supportCol = colNameFromRowKeyed(val);
        supportVarLines.push(`    _${key}_col = "${supportCol}"`);
        supportVarLines.push(
          `    ${key} = {` +
            `row_id: [table_data["rows"][row_id]["cells"][_${key}_col]["label"], [], _${key}_col]` +
            ` for row_id in table_data["rows"]}`,
        );
      }
      otherParamsEntries.push(`"${key}": ${key}`);
    } else {
      // Scalar / checkbox / radio / text — pass value as-is with the exact
      // formParam id so the backend's responseTransformer can find it in props.
      otherParamsEntries.push(`"${key}": ${valueToPython(val)}`);
    }
  }

  const supportBlock =
    supportVarLines.length > 0
      ? "\n    # Support column references — built dynamically from the live table\n" +
        supportVarLines.join("\n") +
        "\n"
      : "";

  const otherParamsPy =
    otherParamsEntries.length > 0
      ? `{\n        ${otherParamsEntries.join(",\n        ")}\n    }`
      : "{}";

  return `try:
    table_data = table_manager.get_table(dataset_id, table_id)

    # Store columns before extension
    prev_columns = set(table_data['columns'].keys())
    base_column = "${colName}"
${supportBlock}
    extended_table, extension_payload = extension_manager.extend_column(
        table=table_data,
        column_name=base_column,
        extender_id="${extenderId}",
        properties=[],
        other_params=${otherParamsPy}
    )
    payload = extension_payload

    successMessage, sentPayload = utility.push_to_backend(
        dataset_id, table_id, payload, debug=False
    )
    print(successMessage)

    current_columns = set(extended_table['columns'].keys())
    new_columns = list(current_columns - prev_columns)
    affected_columns = [base_column] + new_columns

    html_table = Utility.display_json_table(
        json_table=extended_table, number_of_rows=4, from_row=0, labels=affected_columns
    )
    if html_table is not None:
        from IPython.display import display
        display(html_table)
except Exception as e:
    print(f"An error occurred during extension: {e}")
`;
}

function genModification(op) {
  const colName = op.columnName;
  const modifierId = op.modifier;
  const ad = op.additionalData || {};

  const config = loadServiceConfig(modifierId);
  const { paramTypes, rowKeyedIds } = getFormParamMeta(config);

  const supportVarLines = [];
  const propsEntries = [];

  for (const [key, val] of Object.entries(ad)) {
    if (!paramTypes.has(key)) continue; // metadata — skip

    if (rowKeyedIds.has(key)) {
      if (paramTypes.get(key) === "multipleColumnSelect") {
        const cols = Object.keys(val).map((c) => `"${c}"`);
        const varName = `_${key}`;
        supportVarLines.push(
          `    ${varName} = {` +
            `col: {row_id: [table_data["rows"][row_id]["cells"][col]["label"], [], col]` +
            ` for row_id in table_data["rows"]}` +
            ` for col in [${cols.join(", ")}]}`,
        );
        propsEntries.push(`"${key}": ${varName}`);
      } else {
        const supportCol = colNameFromRowKeyed(val);
        const colVar = `_${key}_col`;
        const dataVar = `_${key}`;
        supportVarLines.push(`    ${colVar} = "${supportCol}"`);
        supportVarLines.push(
          `    ${dataVar} = {` +
            `row_id: [table_data["rows"][row_id]["cells"][${colVar}]["label"], [], ${colVar}]` +
            ` for row_id in table_data["rows"]}`,
        );
        propsEntries.push(`"${key}": ${dataVar}`);
      }
    } else {
      propsEntries.push(`"${key}": ${valueToPython(val)}`);
    }
  }

  // `selectedColumns` is not declared in any modifier's formParams but is
  // required by every modifier's responseTransformer to find which column
  // to process. Always derive it from the current column variable.
  propsEntries.push(`"selectedColumns": [modified_column]`);

  const supportBlock =
    supportVarLines.length > 0
      ? "\n    # Support column references — built dynamically from the live table\n" +
        supportVarLines.join("\n") +
        "\n"
      : "";

  const propsPy =
    propsEntries.length > 0
      ? `{\n        ${propsEntries.join(",\n        ")}\n    }`
      : "{}";

  return `try:
    table_data = table_manager.get_table(dataset_id, table_id)
    modified_column = "${colName}"
${supportBlock}
    modified_table, payload = manager.modify(
        table=table_data,
        column_name=modified_column,
        modifier_name="${modifierId}",
        props=${propsPy}
    )

    successMessage, sentPayload = utility.push_to_backend(
        dataset_id, table_id, payload, debug=False
    )
    print(successMessage)

    html_table = Utility.display_json_table(
        json_table=modified_table, number_of_rows=4, from_row=0, labels=[modified_column]
    )
    if html_table is not None:
        from IPython.display import display
        display(html_table)
except Exception as e:
    print(f"An error occurred during modification: {e}")
`;
}

function genPropagation(op) {
  const colName = op.columnName;
  const ad = op.additionalData || {};

  return `try:
    table_data = table_manager.get_table(dataset_id, table_id)

    type_obj = ${valueToPython(ad)}
    propagated_column = '${colName}'

    table_data, backend_payload = manager.propagate_type(
        table_data, propagated_column, type_obj
    )

    successMessage, sentPayload = utility.push_to_backend(
        dataset_id, table_id, backend_payload, debug=False
    )
    print(successMessage)

    html_table = Utility.display_json_table(
        json_table=table_data, number_of_rows=4, from_row=0, labels=[propagated_column]
    )
    if html_table is not None:
        from IPython.display import display
        display(html_table)
except Exception as e:
    print(f"An error occurred during propagation: {e}")
`;
}

function genExport(op) {
  const ad = op.additionalData || {};
  const fmt = (ad.format || "json").toLowerCase();
  const outFile = ad.outputFile || "export_output";

  if (fmt === "csv") {
    return `# Export as CSV
try:
    csv_file = utility.download_csv(
        dataset_id=dataset_id,
        table_id=table_id,
        output_file="${outFile}"
    )
    print(f"✓ CSV downloaded: {csv_file}")
except Exception as e:
    print(f"✗ Error downloading CSV: {e}")
`;
  }
  return `# Export as JSON
try:
    json_file = utility.download_json(
        dataset_id=dataset_id,
        table_id=table_id,
        output_file="${outFile}"
    )
    print(f"✓ JSON downloaded: {json_file}")
except Exception as e:
    print(f"✗ Error downloading JSON: {e}")
`;
}

function genDefaultExport() {
  return `# Default Export (JSON)
try:
    json_file = utility.download_json(
        dataset_id=dataset_id,
        table_id=table_id,
        output_file="results.json"
    )
    print(f"✓ JSON downloaded: {json_file}")
except Exception as e:
    print(f"✗ Error downloading JSON: {e}")
`;
}

function genOperationCode(op) {
  switch (op.operationType) {
    case "RECONCILIATION":
      return genReconciliation(op);
    case "EXTENSION":
      return genExtension(op);
    case "MODIFICATION":
      return genModification(op);
    case "PROPAGATE_TYPE":
      return genPropagation(op);
    case "EXPORT":
      return genExport(op);
    default:
      return `# Unknown operation type: ${op.operationType}\n`;
  }
}

// ---------------------------------------------------------------------------
// File-level blocks
// ---------------------------------------------------------------------------

function genHeader(isNotebook) {
  const baseUrl =
    process.env.BASE_URL || "http://vm.chronos.disco.unimib.it:3003";
  const username = process.env.USERNAME || "";
  const password = process.env.PASSWORD || "";

  const common = `import semt_py
import getpass
from semt_py import AuthManager
from semt_py.extension_manager import ExtensionManager
from semt_py.reconciliation_manager import ReconciliationManager
from semt_py.utils import Utility
from semt_py.dataset_manager import DatasetManager
from semt_py.table_manager import TableManager
from semt_py.modification_manager import ModificationManager

def get_input_with_default(prompt, default):
    user_input = input(f"{prompt} (default: {default}): ").strip()
    return user_input if user_input else default
`;

  if (isNotebook) {
    return (
      common +
      `
base_url = get_input_with_default("Enter base URL or press Enter to keep default", "${baseUrl}")
api_url = base_url + "/api"
username = get_input_with_default("Enter your username", "${username}")
default_password = "${password}"
password_input = getpass.getpass("Enter your password (default: use stored password): ")
password = password_input if password_input else default_password

Auth_manager = AuthManager(api_url, username, password)
token = Auth_manager.get_token()
reconciliation_manager = ReconciliationManager(base_url, Auth_manager)
dataset_manager = DatasetManager(base_url, Auth_manager)
table_manager = TableManager(base_url, Auth_manager)
extension_manager = ExtensionManager(base_url, token)
utility = Utility(base_url, Auth_manager)
manager = ModificationManager(base_url, token)
`
    );
  }

  return (
    common +
    `import argparse

parser = argparse.ArgumentParser(description="SemT Table Processor")
parser.add_argument('--base-url', default=None, help='Base URL for the API')
parser.add_argument('--username', default=None, help='Username for authentication')
parser.add_argument('--password', default=None, help='Password for authentication')
parser.add_argument('--dataset-id', default=None, help='Dataset ID')
parser.add_argument('--table-name', default=None, help='Table name')
parser.add_argument('--csv-file', default=None, help='Path to CSV file')
args = parser.parse_args()

base_url = args.base_url or get_input_with_default(
    "Enter base URL or press Enter to keep default", "${baseUrl}")
api_url = base_url + "/api"
username = args.username or get_input_with_default("Enter your username", "${username}")
if args.password:
    password = args.password
else:
    default_password = "${password}"
    password_input = getpass.getpass("Enter your password (default: use stored password): ")
    password = password_input if password_input else default_password

Auth_manager = AuthManager(api_url, username, password)
token = Auth_manager.get_token()
reconciliation_manager = ReconciliationManager(base_url, Auth_manager)
dataset_manager = DatasetManager(base_url, Auth_manager)
table_manager = TableManager(base_url, Auth_manager)
extension_manager = ExtensionManager(base_url, token)
utility = Utility(base_url, Auth_manager)
manager = ModificationManager(base_url, token)
`
  );
}

function genTableLoader(datasetId, isNotebook, deletedCols = []) {
  const deletedBlock =
    deletedCols.length > 0
      ? `\ndf = df.drop(columns=[${deletedCols.map((c) => `"${c}"`).join(", ")}], errors='ignore')`
      : "";

  if (isNotebook) {
    return `import pandas as pd

dataset_id = get_input_with_default("Enter dataset_id or press Enter to keep default", "${datasetId}")
table_name = get_input_with_default("Enter table_name or press Enter to keep default", "my_table")
filename = get_input_with_default("Enter path to CSV file or press Enter to keep default", "table.csv")
df = pd.read_csv(filename)${deletedBlock}

table_id, message, table_data = table_manager.add_table(dataset_id, df, table_name)
print(f"Table loaded successfully: {message}")
try:
    from IPython.display import display
    display(df.head())
except Exception as e:
    print(df.head().to_string())
`;
  }

  return `import pandas as pd

dataset_id = args.dataset_id or get_input_with_default(
    "Enter dataset_id or press Enter to keep default", "${datasetId}")
table_name = args.table_name or get_input_with_default(
    "Enter table_name or press Enter to keep default", "my_table")
filename = args.csv_file or get_input_with_default(
    "Enter path to CSV file or press Enter to keep default", "table.csv")
df = pd.read_csv(filename)${deletedBlock}

table_id, message, table_data = table_manager.add_table(dataset_id, df, table_name)
print(f"Table loaded successfully: {message}")
try:
    from IPython.display import display
    display(df.head())
except Exception as e:
    print(df.head().to_string())
`;
}

const RELEVANT_TYPES = new Set([
  "RECONCILIATION",
  "EXTENSION",
  "MODIFICATION",
  "PROPAGATE_TYPE",
  "EXPORT",
]);

function operationSeparator(op, num) {
  const svc = op.reconciler || op.extender || op.modifier || "";
  return (
    `\n# ${"=".repeat(77)}\n` +
    `# OPERATION_${num}: ${op.operationType}` +
    (svc ? ` [${svc}]` : "") +
    `\n# Column: ${op.columnName || "N/A"} | Timestamp: ${op.timestamp}\n` +
    `# ${"=".repeat(77)}\n\n`
  );
}

function operationSummary(ops) {
  const relevant = ops.filter((o) => RELEVANT_TYPES.has(o.operationType));
  const lines = [
    `\n# ${"=".repeat(77)}\n`,
    `# OPERATION SUMMARY — ${relevant.length} operation(s)\n`,
    `# ${"=".repeat(77)}\n`,
  ];
  for (const op of relevant) {
    const svc = op.reconciler || op.extender || op.modifier || "";
    lines.push(
      `# - ${op.operationType} on '${op.columnName || "N/A"}'` +
        (svc ? ` [${svc}]` : "") +
        ` @ ${op.timestamp}\n`,
    );
  }
  lines.push(`# ${"=".repeat(77)}\n`);
  return lines.join("");
}

// ---------------------------------------------------------------------------
// Python script generator
// ---------------------------------------------------------------------------

function generatePython(datasetId, operations, deletedCols) {
  const parts = [];
  const relevant = operations.filter((o) =>
    RELEVANT_TYPES.has(o.operationType),
  );
  const hasExport = relevant.some((o) => o.operationType === "EXPORT");

  parts.push(genHeader(false));
  parts.push("\n");
  parts.push(genTableLoader(datasetId, false, deletedCols));
  parts.push("\n");

  let opNum = 0;
  for (const op of relevant) {
    opNum++;
    parts.push(operationSeparator(op, opNum));
    parts.push(genOperationCode(op));
    parts.push("\n");
  }

  if (!hasExport) {
    opNum++;
    parts.push(
      `\n# ${"=".repeat(77)}\n# OPERATION_${opNum}: EXPORT (default)\n# ${"=".repeat(77)}\n\n`,
    );
    parts.push(genDefaultExport());
    parts.push("\n");
  }

  parts.push(operationSummary(relevant));
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Jupyter notebook generator
// ---------------------------------------------------------------------------

function srcLines(text) {
  // Split into lines, preserving newlines in each element except the last
  const lines = text.split("\n");
  return lines
    .map((l, i) => (i < lines.length - 1 ? l + "\n" : l))
    .filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
}

function codeCell(source, metadata = {}) {
  return {
    cell_type: "code",
    id: randomUUID(),
    metadata,
    source: srcLines(source),
    execution_count: null,
    outputs: [],
  };
}

function mdCell(source, metadata = {}) {
  return {
    cell_type: "markdown",
    id: randomUUID(),
    metadata,
    source: srcLines(source),
  };
}

function generateNotebook(datasetId, operations, deletedCols) {
  const cells = [];
  const relevant = operations.filter((o) =>
    RELEVANT_TYPES.has(o.operationType),
  );
  const hasExport = relevant.some((o) => o.operationType === "EXPORT");

  // --- Summary markdown cell ---
  const summaryLines = [
    `# Operation Summary\n`,
    `**Total operations processed:** ${relevant.length}\n\n`,
  ];
  for (const op of relevant) {
    const svc = op.reconciler || op.extender || op.modifier || "";
    const svcStr = svc ? ` using **${svc}**` : "";
    summaryLines.push(
      `- **${op.operationType}** on \`${op.columnName || "N/A"}\`${svcStr} at \`${op.timestamp}\`\n`,
    );
  }
  cells.push(
    mdCell(summaryLines.join(""), {
      semtparser: { cell_type: "summary", total_operations: relevant.length },
    }),
  );

  // --- Setup section ---
  cells.push(mdCell("## Operation 0: Setup and Data Loading\n"));
  cells.push(
    codeCell(genHeader(true), {
      semtparser: { operation_index: 0, operation_type: "SETUP" },
    }),
  );
  cells.push(
    codeCell(genTableLoader(datasetId, true, deletedCols), {
      semtparser: { operation_index: 0, operation_type: "LOAD" },
    }),
  );

  // --- Operation cells ---
  let opNum = 0;
  for (const op of relevant) {
    opNum++;
    const svc = op.reconciler || op.extender || op.modifier || "";
    cells.push(
      mdCell(
        `## Operation ${opNum}: ${op.operationType}${svc ? ` — ${svc}` : ""}\n` +
          `**Column:** \`${op.columnName || "N/A"}\` | **Timestamp:** \`${op.timestamp}\`\n`,
        {
          semtparser: {
            operation_index: opNum,
            operation_type: op.operationType,
          },
        },
      ),
    );
    cells.push(
      codeCell(genOperationCode(op), {
        semtparser: {
          operation_index: opNum,
          operation_type: op.operationType,
          op_id: op.id,
        },
      }),
    );
  }

  // --- Default export ---
  if (!hasExport) {
    opNum++;
    cells.push(mdCell(`## Operation ${opNum}: EXPORT (default)\n`));
    cells.push(codeCell(genDefaultExport()));
  }

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: { name: "python", version: "3.8.0" },
    },
    cells,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const SemtParserService = {
  /**
   * Generate a Python script or Jupyter notebook for the given table.
   *
   * @param {object} params
   * @param {string} params.datasetId
   * @param {string} params.tableId
   * @param {"python"|"notebook"} [params.format]
   * @returns {{ data: string, fileName: string, contentType: string }}
   */
  generate({ datasetId, tableId, format = "python" }) {
    // Build the dependency graph — this also windows the operations to the
    // current editing session (last GET_TABLE → SAVE_TABLE).
    const log = new Log(datasetId, tableId);
    log.buildDependencyGraph();
    const { operations } = log.getObject();

    // Apply deduplication
    const processed = processOperations(operations);

    // Get deleted columns from the SAVE_TABLE entry
    const saveInfo = getSaveTableInfo(datasetId, tableId);
    const rawDeleted = saveInfo?.deletedCols || "";
    const deletedCols =
      rawDeleted && rawDeleted !== "NO_DELETED"
        ? rawDeleted
            .split("|-|")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

    const ts = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "_")
      .replace(":", "-");

    if (format === "notebook") {
      const nb = generateNotebook(datasetId, processed, deletedCols);
      return {
        data: JSON.stringify(nb, null, 2),
        fileName: `notebook_${datasetId}_${tableId}_${ts}.ipynb`,
        contentType: "application/json",
      };
    }

    return {
      data: generatePython(datasetId, processed, deletedCols),
      fileName: `script_${datasetId}_${tableId}_${ts}.py`,
      contentType: "text/x-python",
    };
  },
};
