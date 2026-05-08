import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

//Wikidata OpenRefine, Alligator
router.get("/wikidata", async (req, res) => {
  const { id } = req.query; // es: Q42
  console.log("id", id);

  const cleanId = id.replace(/^wdA:/, "").replace(/^wd:/, "").trim();
  console.log("cleanId",cleanId);
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${cleanId}.json`;
  console.log("url", url);

  try {
    const result = await fetch(url);
    const data = await result.json();
    const entity = data.entities?.[cleanId];
    console.log("entity", entity);
    const name = entity?.labels?.en?.value;
    const description = entity?.descriptions?.en?.value || "";
    console.log("description", description);
    const typeClaims = entity?.claims?.P31 || [];
    const typeIds = typeClaims.map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

    let type = [];
    if (typeIds.length > 0) {
      const idsParam = typeIds.join("|");
      const tUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${idsParam}&format=json`;
      const tRes = await fetch(tUrl);
      const tData = await tRes.json();

      type = Object.keys(tData.entities || {}).map(id => ({
        id,
        name: tData.entities[id]?.labels?.en?.value || id
      }));
    }

    res.json({ name, description, type });
  } catch (err) {
    res.status(500).json({ error: "Wikidata request failed" });
  }
});

//Wikidata LionLinker
router.get("/lionlinker", async (req, res) => {
  const { id, label } = req.query;

  const endpoint = process.env.RETRIEVER_ENDPOINT || "https://lamapi.hel.sintef.cloud/lookup/entity-retrieval";
  const token = process.env.RETRIEVER_TOKEN || "lamapi_demo_2023";
  const url = `${endpoint}?name=${encodeURIComponent(label)}&token=${token}`;

  try {
    const result = await fetch(url);
    const data = await result.json();

    const cleanId = id.replace(/^wdL:/, "").trim();
    const entity = Array.isArray(data)
      ? data.find(e => e.id === cleanId)
      : null;

    res.json({
      name: entity?.name || label || "",
      description: entity?.description || "",
      type: entity?.types || []
    });
  } catch (err) {
    res.status(500).json({ error: "LionLinker request failed" });
  }
});

//Geonames
router.get("/geonames", async (req, res) => {
  const { id } = req.query;
  const endpoint = process.env.GEONAMES;
  const token = process.env.GEONAMES_TOKEN;
  const cleanId = id.replace(/^geo:/, "").trim();

  const url = `${endpoint}/getJSON?geonameId=${cleanId}&username=${token}`;
  console.log("url", url);

  try {
    const result = await fetch(url);
    const item = await result.json();
    if (!item || Object.keys(item).length === 0) {
      console.warn(`No results found for ID: ${cleanId}`);
      return { description: "", type: [] };
    }
    res.json({
      name: item.name || "",
      description: item.toponymName || "",
      type: [ { id: item.fcode, name: item.fcodeName } ]
    });
  } catch (e) {
    res.status(500).json({ error: "Geonames request failed" });
  }
});

//GeoCoordinates
router.get("/geonamesCoordinates", async (req, res) => {
  console.log("req.query", req.query);
  const [lat, lng] = req.query.id.split(",");
  const endpoint = process.env.GEONAMES;
  const token = process.env.GEONAMES_TOKEN;

  const url = `${endpoint}/findNearbyPlaceNameJSON?lat=${lat}&lng=${lng}&username=${token}`;
  console.log("url", url);

  try {
    const result = await fetch(url);
    const data = await result.json();
    const item = data.geonames?.[0];
    console.log("item", item);

    res.json({
      name: item?.name || "",
      description: item?.toponymName || "",
      type: [
        {
          id: item?.fcode || "",
          name: item?.fcodeName || "",
        },
      ],
    });
  } catch (e) {
    res.status(500).json({ error: "Geonames geocoding failed" });
  }
});

// OpenStreetMap (Nominatim Proxy)
router.get("/osm", async (req, res) => {
  const { id } = req.query;
  let url = "";
  const userAgent = { "User-Agent": "SemTX/1.0" };

  try {
    if (id.includes(",")) {
      // Raw Coordinate
      const [lat, lon] = id.split(",");
      url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`;
    } else if (id.includes("/")) {
      // Relation/Way/Node
      const [type, osmId] = id.split("/");
      const prefix = type.charAt(0).toUpperCase(); // R, W, o N
      url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${osmId}&format=json`;
    }

    if (!url) return res.status(400).json({ error: "Invalid ID format" });

    const response = await fetch(url, { headers: userAgent });
    const data = await response.json();
    console.log("OSM data:", data);

    const item = Array.isArray(data) ? data[0] : data;

    if (!item || item.error) {
      return res.status(404).json({ error: "No OSM data found" });
    }

    res.json({
      name: item.display_name?.split(",")[0] || "Unknown",
      osmId: item.osm_id,
      osmType: item.osm_type,
      lat: item.lat,
      lon: item.lon
    });
  } catch (err) {
    res.status(500).json({ error: "OSM request failed" });
  }
});

export default router;
