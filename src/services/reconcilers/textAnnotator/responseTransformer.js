export default async (req, res) => {
  const { result, error } = res;
  const { items } = req.original;
  const prefix = "wd";

  const response = [];

  // Header cell — empty metadata
  const headerItem = items.find((item) => !item.id.includes("$"));
  if (headerItem) {
    response.push({ id: headerItem.id, metadata: [] });
  }

  // Body cells
  for (const item of items.filter((i) => i.id.includes("$"))) {
    const annotatorResult = result[item.id] || { annotations: {} };
    const annotationsDict = annotatorResult.annotations || {};

    // Deduplicate entity candidates across all annotation sets
    const seenIds = new Set();
    const metadata = [];

    Object.values(annotationsDict)
      .flat()
      .forEach((ann) => {
        const entity = ann?.features?.entity;
        if (!entity?.id) return;

        // entity.id is already prefixed (e.g. "wd:Q2747")
        const fullId = entity.id.includes(":") ? entity.id : `${prefix}:${entity.id}`;
        if (seenIds.has(fullId)) return;
        seenIds.add(fullId);

        const rawName =
          entity.name && typeof entity.name === "object" && entity.name.value
            ? entity.name.value
            : entity.name ?? ann.features?.text ?? "";

        metadata.push({
          id: fullId,
          name: rawName,
          score: entity.score ?? 1,
          match: entity.match ?? false,
          type: [],
        });
      });

    response.push({
      id: item.id,
      metadata,
      // Pass raw W3C annotations through so the NER tab can render them
      annotations: annotationsDict,
    });
  }

  return { ...response, error };
};
