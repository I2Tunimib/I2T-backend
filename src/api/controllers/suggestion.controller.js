import ParseService from "../services/parse/parse.service.js";
import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import axios from "axios";

async function fetchWikidataEntities(entityIds) {
  const baseUrl = "https://www.wikidata.org/w/api.php";
  const params = {
    action: "wbgetentities",
    ids: entityIds.join("|"),
    format: "json",
    origin: "*", // This is required to avoid CORS issues
  };

  try {
    const response = await axios.get(baseUrl, { params });

    return response.data.entities;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function fetchPropertyLabels(propertyIds) {
  if (propertyIds.length === 0) return {};

  // Create the VALUES clause for the SPARQL query
  const valuesClause = `VALUES ?property { ${propertyIds
    .map((id) => `wd:${id}`)
    .join(" ")} }`;

  const query = `
    SELECT ?property ?propertyLabel
    WHERE {
      ${valuesClause}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  const url = "https://query.wikidata.org/sparql";
  const headers = {
    Accept: "application/sparql-results+json",
    "User-Agent": "YourAppName/1.0",
  };

  try {
    const response = await axios.get(url, {
      params: { query },
      headers,
    });

    const labels = {};
    response.data.results.bindings.forEach((binding) => {
      const propId = binding.property.value.split("/").pop();
      labels[propId] = binding.propertyLabel.value;
    });

    // Fill in any missing properties with their IDs
    propertyIds.forEach((id) => {
      if (!labels[id]) labels[id] = id;
    });

    return labels;
  } catch (error) {
    console.error("SPARQL query error:", error);
    // Fallback: return object with property IDs as values
    const fallback = {};
    propertyIds.forEach((id) => (fallback[id] = id));
    return fallback;
  }
}

const SuggestionsController = {
  wikidata: async (req, res, next) => {
    try {
      let data = req.body;
      const allIds = data.map((item) => {
        if (item.id.startsWith("wd:")) {
          return item.id.split(":")[1];
        }
      });
      let wikidataProps = await fetchWikidataEntities(allIds);
      // Extract all unique property IDs
      const propertyIds = new Set();
      for (const entityId in wikidataProps) {
        const claims = wikidataProps[entityId].claims;
        for (const propId in claims) {
          propertyIds.add(propId);
        }
      }
      const propertyLabels = await fetchPropertyLabels([...propertyIds]);
      let idProps = {};
      for (const propKey in propertyLabels) {
        const propId = propertyLabels[propKey];
        const propLabel = propertyLabels[propKey];
        idProps[propKey] = { label: propLabel, count: 0, percentage: 0 };
      }
      //count occurences in data
      for (const itemKey in wikidataProps) {
        const item = wikidataProps[itemKey];
        const claims = item.claims;
        for (const claim in claims) {
          if (idProps[claim]) {
            idProps[claim].count++;
            idProps[claim].percentage =
              (idProps[claim].count / allIds.length) * 100;
          }
        }
      }
      //sort by percentage and transform to array of objects
      const sortedIdProps = Object.entries(idProps)
        .map(([key, value]) => ({ id: key, ...value }))
        .sort((a, b) => b.percentage - a.percentage);

      res.json({ data: sortedIdProps });
    } catch (err) {
      next(err);
    }
  },
};

export default SuggestionsController;
