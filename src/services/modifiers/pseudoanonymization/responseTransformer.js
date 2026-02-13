export default async (req, res) => {
  // Support both legacy and new properties in the transformer payload.
  // The caller may provide either a boolean `createNewColumn` or an `outputMode` string
  // and an optional `newColumnName`. Prefer `outputMode` when present.
  const {
    columnName,
    operation,
    createNewColumn: legacyCreateNewColumn,
    outputMode,
    newColumnName,
    results,
  } = res;

  // Create the response structure
  let response = {
    columns: {},
    meta: {},
  };

  // Determine whether we should create a new column.
  // Prefer explicit outputMode when provided; otherwise fall back to legacy boolean.
  const willCreateNew =
    typeof outputMode === "string"
      ? outputMode === "newColumn"
      : !!legacyCreateNewColumn;

  // Determine the column name to use.
  // If a new column is requested and the user provided a `newColumnName`, use it.
  // Otherwise default to original column name with suffix `_anonymized` or `_deanonymized`.
  let targetColumnName;
  if (willCreateNew) {
    if (
      newColumnName &&
      typeof newColumnName === "string" &&
      newColumnName.trim().length > 0
    ) {
      targetColumnName = newColumnName.trim();
    } else {
      // Use suffix at the end of the original name as requested
      targetColumnName =
        operation === "encrypt"
          ? `${columnName}_anonymized`
          : `${columnName}_deanonymized`;
    }
  } else {
    // Replace the current column (default behavior)
    targetColumnName = columnName;
  }

  // Initialize the column
  response.columns[targetColumnName] = {
    label: targetColumnName,
    kind: "literal",
    metadata: [],
    cells: {},
  };

  // Process each row result
  results.forEach((result) => {
    const { rowId, processedData, operation: resultOperation } = result;

    // Extract the processed value from the response
    let processedValue = "";

    if (resultOperation === "encrypt") {
      if (processedData && processedData.vaultKey) {
        processedValue = processedData.vaultKey;
      } else if (processedData && processedData.error) {
        processedValue = `ERROR: ${processedData.error}`;
      } else {
        processedValue = "ENCRYPTION_FAILED";
      }
    } else if (resultOperation === "decrypt") {
      if (processedData && processedData.decryptedData) {
        processedValue = processedData.decryptedData;
      } else if (processedData && processedData.error) {
        processedValue = `ERROR: ${processedData.error}`;
      } else {
        processedValue = "DECRYPTION_FAILED";
      }
    } else {
      processedValue = `ERROR: Invalid operation ${resultOperation}`;
    }

    // Add the cell data
    response.columns[targetColumnName].cells[rowId] = {
      label: processedValue,
      metadata: [],
    };
  });

  return response;
};
