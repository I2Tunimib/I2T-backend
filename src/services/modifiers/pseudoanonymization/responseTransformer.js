export default async (req, res) => {
  const { columnName, operation, results } = res;

  // Create the response structure
  let response = {
    columns: {},
    meta: {},
  };

  // Create the new column name based on operation
  const newColumnName =
    operation === "encrypt"
      ? `pseudoanonymized_${columnName}`
      : `deanonymized_${columnName}`;

  // Initialize the new column
  response.columns[newColumnName] = {
    label: newColumnName,
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
    response.columns[newColumnName].cells[rowId] = {
      label: processedValue,
      metadata: [],
    };
  });

  return response;
};
