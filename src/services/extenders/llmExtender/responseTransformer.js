/**
 * Transforms the enriched data with LLM results into a structured format
 * suitable for downstream consumption.
 *
 * @param {Object} req - The request object containing user parameters
 * @param {Array} enrichedRows - Array of enriched data with LLM results.
 *   Each row should have: dynamically named columns based on user input, plus rowId
 * @returns {Object} response - Structured response with columns for each field
 */
export default async (req, enrichedRows) => {
  // Get the column names from user input (comma-separated)
  const columnNamesInput = req.original.props.columnNames || "";
  const columnNames = columnNamesInput
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  // Prepare response object with columns for each user-defined field
  let response = {
    columns: {},
    meta: {},
  };

  // Initialize columns structure
  columnNames.forEach((colName) => {
    response.columns[colName] = {
      label: colName,
      cells: {},
      metadata: [],
    };
  });

  // Populate cells for each column using enriched data
  enrichedRows.forEach((row, idx) => {
    const rowId = row.rowId ?? idx;

    columnNames.forEach((colName) => {
      const value = row[colName];
      response.columns[colName].cells[rowId] = {
        label: value !== null && value !== undefined ? String(value) : "-",
        metadata: [],
      };
    });
  });

  return response;
};
