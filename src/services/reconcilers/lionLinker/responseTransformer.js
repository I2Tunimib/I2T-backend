import config from "./index.js";

const { uri, prefix } = config.public;

export default async (req, res) => {
  const { result, labelDict, error } = res;
  const { items } = req.processed;
  console.log("*** lion linker res", JSON.stringify(result));
  if (error) {
    return { error };
  }

  if (!result) {
    return { error: req.config.errors.reconciler["01"] };
  }

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

      // Flatten all answers from all predictions for this row
      const metadata = predictions.flatMap((pred) => {
        // pred.answer is now an object with candidate_ranking array
        const answerObj = pred.answer || {};
        const candidates = Array.isArray(answerObj.candidate_ranking)
          ? answerObj.candidate_ranking
          : [];

        return candidates
          .filter((ans) => ans && ans.id && /Q\d+/.test(ans.id))
          .map((ans, index) => {
            const wikidataId = ans.id;

            // Process types array
            const types = (ans.types || []).map((typeObj) => ({
              id: `${prefix}:${typeObj.id}`,
              name: typeObj.name || "",
              match: false, // Types are not marked as match typically
            }));

            return {
              id: `${prefix}:${wikidataId}`,
              name: ans.name || label,
              uri: `${uri}${wikidataId}`,
              score:
                ans.confidence_score !== undefined ? ans.confidence_score : 0,
              confidence_label: ans.confidence_label || "UNKNOWN",
              type: types,
              description: ans.description || "",
              match: ans.match !== undefined ? ans.match : index === 0, // First answer or explicit match flag
              identifier: pred.identifier || wikidataId, // The selected identifier from prediction
              explanation: answerObj.explanation || "", // Add explanation from answer object
            };
          });
      });

      return { id: cellId, metadata };
    });
  });

  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      return item.metadata.some((meta) => meta.match);
    }
    return false;
  });

  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  return { ...response, error: res.error };
};
