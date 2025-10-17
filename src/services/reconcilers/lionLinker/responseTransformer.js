import config from "./index.js";

const { uri } = config.public;

export default async (req, res) => {
  const { result, labelDict, error } = res;
  const { items } = req.processed;

  // Map rowId to predictions
  const rowPredictions = {};
  result.forEach((row) => {
    rowPredictions[row.idRow] = row.predictions || [];
  });

  const response = Object.keys(items).flatMap((label) => {
    return items[label].map((cellId) => {
      const rowMatch = cellId.match(/r(\d+)\$/);
      const rowId = rowMatch ? parseInt(rowMatch[1]) : null;
      const predictions = rowPredictions[rowId] || [];
      console.log("*** predictions ***", predictions);
      const metadata = predictions.map((pred) => {
        const answerPart = pred.answer.split("ANSWER:")[1] ?? "";
        const wikidataId = answerPart.match(/Q\d+/)?.[0] ?? "N/A";
        return {
          id: `wd:${wikidataId}`,
          name: pred.name || label,
          uri: pred.uri || `${uri}${wikidataId}`,
          // name: {
          //   value:
          //   uri: pred.uri || `${uri}${wikidataId}`,
          // },
          score: pred.score || 1,
          type: pred.type || [],
          description: pred.description || "",
          match: pred.answer !== "ANSWER:NIL",
        };
      });
      return { id: cellId, metadata };
    });
  });

  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      // For cells, check if any metadata has match
      return item.metadata.some((meta) => meta.match);
    }
    return false;
  });

  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  return { ...response, error: res.error };
};
