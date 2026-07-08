import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const { relativeUrl } = config.public;

export default async (req) => {
  const { items, props } = req.original;
  const { selectedColumns } = props;

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected.");
  }

  // results: { [colName]: { [rowId]: annotatorResponse } }
  const results = {};

  await Promise.all(
    selectedColumns.map(async (col) => {
      results[col] = {};
      const columnData = items[col];
      if (!columnData) return;

      await Promise.all(
        Object.entries(columnData).map(async ([rowId, val]) => {
          const text = String(val?.[0] ?? "").trim();
          if (!text) {
            results[col][rowId] = { annotations: {} };
            return;
          }
          try {
            const response = await axios.post(
              `${endpoint}${relativeUrl}`,
              text,
              { headers: { "Content-Type": "text/plain" } },
            );
            results[col][rowId] = response.data;
          } catch (err) {
            console.error(
              `textAnnotator: failed for ${col}/${rowId}:`,
              err.message,
            );
            results[col][rowId] = { annotations: {} };
          }
        }),
      );
    }),
  );

  return { result: results, error: null };
};
