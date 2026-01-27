import config from "./index.js";
import axios from "axios";

const { endpoint, relativeUrl } = config.private;

async function makeRequest(endpoint, payload, row) {
  const res = await axios.post(endpoint + "/validate", payload);
  res.data["row"] = row;
  return res.data;
}

export default async (req) => {
  const { items } = req.original;

  console.log("=== CH Matching Request Transformer ===");
  console.log("Total columns to process:", Object.keys(items).length);

  const columnIds = Object.keys(items);
  columnIds.forEach((colId) => {
    const rowIds = Object.keys(items[colId]);
    console.log(`Column ${colId}: ${rowIds.length} rows to process`);
    console.log(
      `First 3 row samples:`,
      rowIds.slice(0, 3).map((rowId) => ({
        rowId,
        value: items[colId][rowId]?.value,
        kbId: items[colId][rowId]?.kbId,
        matchingType: items[colId][rowId]?.matchingType,
      })),
    );
  });

  const results = await Promise.all(
    Object.keys(items).map(async (data) => {
      const rowIds = Object.keys(items[data]);
      console.log(`Processing ${rowIds.length} rows for column ${data}`);

      const rowResults = await Promise.all(
        rowIds.map(async (row) => {
          const rowData = items[data][row];
          const company_name = rowData?.value || "";

          // Build address object from additionalColumns
          const address = {};

          // Handle additionalColumns from props (object with column names as keys)
          if (
            req.original.props.additionalColumns &&
            typeof req.original.props.additionalColumns === "object"
          ) {
            const additionalColumnKeys = Object.keys(
              req.original.props.additionalColumns,
            );

            additionalColumnKeys.forEach((colId, index) => {
              if (
                req.original.props.additionalColumns[colId] &&
                req.original.props.additionalColumns[colId][row]
              ) {
                const value =
                  req.original.props.additionalColumns[colId][row][0];
                // Map columns to address fields based on order
                if (index === 0) address.line_1 = value;
                else if (index === 1) address.line_2 = value;
                else if (index === 2) address.postcode = value;
              }
            });
          }

          const payload = { company_name };

          // Only add address if it has at least one field
          if (Object.keys(address).length > 0) {
            payload.address = address;
          }

          let res = await makeRequest(endpoint, payload, row);
          return res;
        }),
      );

      console.log(`Received ${rowResults.length} responses for column ${data}`);
      return rowResults;
    }),
  );

  console.log("=== CH Matching Request Transformer Complete ===");
  console.log("Total results returned:", results.flat().length);

  return results;
};
