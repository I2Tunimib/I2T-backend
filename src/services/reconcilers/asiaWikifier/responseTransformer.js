import config from "./index.js";

const { uri } = config.public;

export default async (req, res) => {
  const { result, labelDict, error } = res;
  const { items } = req.processed;

  const response = Object.keys(result).flatMap((label) => {
    const metadata = result[label].result.map(({ id, ...rest }) => ({
      id: `dbp:${id}`,
      ...rest,
    }));

    return items[label].map((cellId) => ({
      id: cellId,
      metadata,
    }));
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
