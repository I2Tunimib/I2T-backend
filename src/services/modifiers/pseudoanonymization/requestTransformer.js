import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;

async function makeEncryptionRequest(valueToEncrypt) {
  try {
    const res = await axios({
      method: "post",
      url: `${endpoint}/transit/encrypt`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        fieldToEncrypt: valueToEncrypt,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error encrypting value:", valueToEncrypt, error);
    return {
      fieldToEncrypt: valueToEncrypt,
      vaultKey: null,
      error: error.message,
    };
  }
}

async function makeDecryptionRequest(valueToDecrypt) {
  try {
    const res = await axios({
      method: "post",
      url: `${endpoint}/transit/decrypt`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        fieldToDecrypt: valueToDecrypt,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error decrypting value:", valueToDecrypt, error);
    return {
      fieldToDecrypt: valueToDecrypt,
      decryptedData: null,
      error: error.message,
    };
  }
}

/**
 * requestTransformer
 *
 * This function is more defensive than before: it accepts either:
 * - an object shaped like { original: { items, props } } (the usual internal call)
 * - or an object shaped like { items, props } (external libraries may call this directly)
 *
 * It validates inputs and returns an empty-but-valid result when no data is present,
 * or throws a clear error when the request format is invalid.
 */
export default async (reqArg) => {
  console.log("request", JSON.stringify(reqArg));
  // Normalize request argument to always have `original: { items, props }`
  let original;
  if (
    reqArg &&
    reqArg.original &&
    (reqArg.original.items || reqArg.original.props)
  ) {
    original = reqArg.original;
  } else if (reqArg && (reqArg.items || reqArg.props)) {
    original = { items: reqArg.items || {}, props: reqArg.props || {} };
  } else {
    throw new Error(
      "Invalid request format for pseudoanonymization transformer. Expected { original: { items, props } } or { items, props }",
    );
  }

  // Ensure items/props are objects
  const { items = {}, props = {} } = original;
  if (items == null || typeof items !== "object") {
    throw new Error(
      "Invalid `items` provided to pseudoanonymization transformer. Expected an object.",
    );
  }
  if (props == null || typeof props !== "object") {
    throw new Error(
      "Invalid `props` provided to pseudoanonymization transformer. Expected an object.",
    );
  }

  // Determine operation (encrypt / decrypt)
  // `props.decrypt` may be a boolean, an array, or undefined.
  const isDecrypt = Array.isArray(props.decrypt)
    ? props.decrypt.length > 0
    : !!props.decrypt;
  const operation = isDecrypt ? "decrypt" : "encrypt";

  // Support new outputMode/newColumnName props:
  // outputMode: 'replace' | 'newColumn' (default to 'newColumn' per UI change)
  // newColumnName: optional user-provided name for the new column
  const outputMode =
    typeof props.outputMode === "string"
      ? props.outputMode
      : props.createNewColumn
        ? "newColumn"
        : "replace";
  const createNewColumn = outputMode === "newColumn";
  const newColumnName = props.newColumnName || "";

  // Resolve selected columns robustly. Accept either `selectedColumns` (array)
  // or a single `selectedColumn` value. If none provided, fall back to first item in `items`.
  let selectedColumns = [];
  if (
    Array.isArray(props.selectedColumns) &&
    props.selectedColumns.length > 0
  ) {
    selectedColumns = props.selectedColumns;
  } else if (props.selectedColumn) {
    selectedColumns = [props.selectedColumn];
  } else {
    // If the request didn't specify a column, try to use the first column key in items
    const itemKeys = Object.keys(items || {});
    if (itemKeys.length > 0) {
      selectedColumns = [itemKeys[0]];
    }
  }

  if (!selectedColumns || selectedColumns.length === 0) {
    // No columns to process — return an empty result consistent with the responseTransformer
    return {
      columnName: null,
      operation,
      createNewColumn,
      outputMode,
      newColumnName,
      results: [],
    };
  }

  const columnToProcess = selectedColumns[0];
  // Get the column data safely; if missing, treat it as empty object
  const columnData =
    items && items[columnToProcess] ? items[columnToProcess] : {};

  // Build a union of row IDs across all columns in `items` so we attempt anonymization
  // for every row that appears anywhere, even if this specific column has missing values.
  const rowIdSet = new Set();
  Object.keys(items || {}).forEach((colKey) => {
    const colData = items[colKey] || {};
    if (colData && typeof colData === "object") {
      Object.keys(colData).forEach((rid) => rowIdSet.add(rid));
    }
  });

  // If no row IDs were found across items, fall back to keys of the target column (may be empty).
  if (rowIdSet.size === 0 && columnData && typeof columnData === "object") {
    Object.keys(columnData).forEach((rid) => rowIdSet.add(rid));
  }

  const rowIds = Array.from(rowIdSet);
  console.log("**number of rows to anonymize***", rowIds.length);

  // Make requests for all rows based on operation. For rows where the target column
  // has no value, we pass null through to the encrypt/decrypt endpoints so they are
  // still invoked and can decide how to handle empty/missing values.
  const processingPromises = rowIds.map(async (rowId) => {
    // The cell may be a scalar, an array, or undefined. Prefer the first element for arrays.
    const cell = columnData ? columnData[rowId] : undefined;
    const originalValue = Array.isArray(cell)
      ? cell.length > 0
        ? cell[0]
        : null
      : cell === undefined
        ? null
        : cell;

    let result;
    try {
      if (operation === "encrypt") {
        result = await makeEncryptionRequest(originalValue);
        return {
          rowId: rowId,
          originalValue: originalValue,
          processedData: result,
          operation: "encrypt",
        };
      } else if (operation === "decrypt") {
        result = await makeDecryptionRequest(originalValue);
        return {
          rowId: rowId,
          originalValue: originalValue,
          processedData: result,
          operation: "decrypt",
        };
      } else {
        return {
          rowId: rowId,
          originalValue: originalValue,
          processedData: { error: "Invalid operation" },
          operation: operation,
        };
      }
    } catch (err) {
      // In case a single row fails unexpectedly, capture the error per-row instead of failing the whole batch.
      return {
        rowId: rowId,
        originalValue: originalValue,
        processedData: {
          error: err && err.message ? err.message : String(err),
        },
        operation: operation,
      };
    }
  });

  const results = await Promise.all(processingPromises);

  return {
    columnName: columnToProcess,
    operation: operation,
    createNewColumn: createNewColumn,
    outputMode: outputMode,
    newColumnName: newColumnName,
    results: results,
  };
};
