export default async (req) => {
  const { columnName, prefix, columnToReconcile } = req.original.props;
  const reconcilers = req.config.reconcilers || [];
  const matchedReconciler = reconcilers.find(r => r.prefix === prefix);
  const targetUri = matchedReconciler?.uri || "";
  const targetRelativeUrl = matchedReconciler?.relativeUrl || "";
  //console.log("Matched reconciler for prefix:", prefix, matchedReconciler.prefix);

  const basePath = `../${matchedReconciler.id}`;
  const { default: config } = await import(`${basePath}/index.js`);
  const endpoint = config.private?.endpoint;
  const token = config.private?.access_token || "";

  const items = req.processed?.items || {};

  const itemKeys = Object.keys(items);
  if (!itemKeys.length) {
    console.warn("No item found");
    return { result: [], error: null };
  }

  let fetchMetadata;

  switch (matchedReconciler.id) {
    case "wikidataOpenRefine":
      fetchMetadata = async (refValue) => {
        try {
          const cleanId = refValue.split(":").pop();
          const url = `https://www.wikidata.org/wiki/Special:EntityData/${cleanId}.json`;
          console.log("Wikidata fetch URL:", url);

          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          const data = await res.json();
          const entity = data.entities?.[cleanId];
          const description = entity?.descriptions?.en?.value || "";
          const typeClaims = entity?.claims?.P31 || [];
          const typeIds = typeClaims
            .map(c => c.mainsnak?.datavalue?.value?.id)
            .filter(Boolean);

          let type = [];
          if (typeIds.length > 0) {
            const idsParam = typeIds.join("|");
            const typesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${idsParam}&format=json&origin=*`;
            const typeRes = await fetch(typesUrl);
            const typeData = await typeRes.json();
            type = Object.keys(typeData.entities || {}).map(id => ({
              id,
              name: typeData.entities[id]?.labels?.en?.value || id,
            }));
          }
          return { description, type };
        } catch (err) {
          console.error("Error Wikidata OpenRefine:", err);
          return { description: "", type: [] };
        }
      };
      break;
    case "wikidataAlligator":
      fetchMetadata = async (refValue) => {
        try {
          const cleanId = refValue.replace(/^wd:/, "").trim();
          const url = `https://www.wikidata.org/wiki/Special:EntityData/${cleanId}.json`;
          console.log("Wikidata (via Alligator) fetch URL:", url);

          const res = await fetch(url, { headers: { Accept: "application/json" } });
          const data = await res.json();
          const entity = data.entities?.[cleanId];
          const description = entity?.descriptions?.en?.value || "";
          const typeClaims = entity?.claims?.P31 || [];
          const typeIds = typeClaims
            .map((c) => c.mainsnak?.datavalue?.value?.id)
            .filter(Boolean);

          let type = [];
          if (typeIds.length > 0) {
            const idsParam = typeIds.join("|");
            const typesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${idsParam}&format=json&origin=*`;
            const typeRes = await fetch(typesUrl);
            const typeData = await typeRes.json();
            type = Object.keys(typeData.entities || {}).map((id) => ({
              id,
              name: typeData.entities[id]?.labels?.en?.value || id,
            }));
          }
          return { description, type };
        } catch (err) {
          console.error("Error Wikidata Alligator fetchMetadata:", err);
          return { description: "", type: [] };
        }
      };
      break;
    case "lionLinker":
      fetchMetadata = async (label, refValue) => {
        try {
          const cleanName = label;
          const cleanId = refValue.replace(/^wd:/, "").trim();
          const retrieverEndpoint = process.env.RETRIEVER_ENDPOINT
            || "https://lamapi.hel.sintef.cloud/lookup/entity-retrieval";
          const token = process.env.RETRIEVER_TOKEN || "lamapi_demo_2023";
          const url = `${retrieverEndpoint}?name=${encodeURIComponent(cleanName)}&token=${token}`;
          console.log("LionLinker fetch URL:", url);

          const res = await fetch(url, { headers: { "Accept": "application/json" } });
          const data = await res.json();
          const entity = Array.isArray(data)
            ? data.find(e => e.id === cleanId)
            : null;
          const description = entity?.description || "";
          const type = Array.isArray(entity?.types)
            ? entity.types.map(t => ({
              id: t.id || "",
              name: t.name || "",
            }))
            : [];
          return { description, type };
        } catch (err) {
          console.error("Error fetchMetadata (LionLinker):", err);
          return { description: "", type: [] };
        }
      };
      break;
    case "geonames":
      fetchMetadata = async (label, refValue) => {
        //console.log("label", label);
        //console.log("refValue", refValue);
        try {
          const cleanId = refValue.replace(/^geo:/, "").trim();
          const url = `${endpoint}/getJSON?geonameId=${encodeURIComponent(cleanId)}&username=${token}`;
          console.log("Geonames URL:", url);

          const res = await fetch(url);
          const item = await res.json();
          if (!item || Object.keys(item).length === 0) {
            console.warn(`No results found for ID: ${cleanId}`);
            return { description: "", type: [] };
          }
          return {
            description: item.toponymName || item.name || "",
            type: [ { id: item.fcode, name: item.fcodeName } ]
          };
        } catch (err) {
          console.error("Error Geonames:", err);
          return { description: "", type: [] };
        }
      };
      break;
    case "geocodingGeonames":
      fetchMetadata = async (refValue) => {
        try {
          const [lat, lng] = refValue.split(":").pop().split(",");
          const url = `${endpoint}/findNearbyPlaceNameJSON?lat=${lat}&lng=${lng}&username=${token}`;
          const res = await fetch(url);
          const data = await res.json();
          const item = data.geonames?.[0];
          return {
            description: item?.name || "",
            type: [
              {
                id: item?.fcode || "",
                name: item?.fcodeName || "",
              },
            ],
          };
        } catch (err) {
          console.error("Error GeocodingGeonames:", err);
          return { description: "", type: [] };
        }
      };
      break;
    case "geocodingHere":
      fetchMetadata = async (refValue) => {
        try {
          //TODO
        } catch (err) {
          console.error("Error GeocodingHere:", err);
          return { description: "", type: [] };
        }
      };
      break;
    default:
      fetchMetadata = async () => ({ description: "", type: [] });
      break;
  }

  const fetchCache = {};

  const result = [];

  for (const label of itemKeys.filter(l => l !== columnName)) {
    const cellIds = items[label];
    if (!cellIds || !cellIds.length) continue;

    const rowId = cellIds[0].split("$")[0];
    const refValue = columnToReconcile[rowId]?.[0];
    if (!refValue) continue;

    const normalizedId = refValue.startsWith(prefix + ":")
      ? refValue
      : `${prefix}:${refValue}`;

    if (!fetchCache[normalizedId]) {
      fetchCache[normalizedId] =
        (matchedReconciler.id === "lionLinker" || matchedReconciler.id === "geonames")
          ? await fetchMetadata(label, normalizedId)
          : await fetchMetadata(normalizedId);
    }

    const metadataInfo = { ...fetchCache[normalizedId] };

    cellIds.forEach(cellId => {
      result.push({
        id: cellId,
        metadata: [
          {
            id: normalizedId,
            name: label,
            description: metadataInfo.description,
            type: metadataInfo.type,
            match: true,
            score: 1.00,
          },
        ],
      });
    });
  }

  console.log("result:", result);

  return {
    result: result.filter(Boolean),
    error: null,
    reconciliator: {
      id: "inTableLinker",
      name: "Linking: In-Table Linking",
      prefix,
      uri: targetUri,
      relativeUrl: targetRelativeUrl,
      description: "A local reconciliation that uses an external prefix to construct URIs.",
    },
  };
};

