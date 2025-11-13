export default async (req, res) => {
  const { result, error, reconciliator } = res;

  const header = {
    id: req.original.items[0].id,
    metadata: [],
  };

  const response = result.map((row) => ({
    id: row.id,
    metadata: row.metadata.map((meta, i) => ({
      id: meta.id,
      name: meta.name || meta.id,
      description: meta.description || "",
      score: meta.score ?? 1.00,
      match: meta.match ?? (i === 0),
      type: meta.type ?? [],
    })),
  }));
  //console.log("response", response);

  response.unshift(header);

  const hasResults = response.some(
    (item) =>
      item.metadata &&
      item.metadata.length > 0 &&
      item.metadata.some((m) => m.match)
  );
  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  return { ...response, reconciliator, error: res.error };
};
