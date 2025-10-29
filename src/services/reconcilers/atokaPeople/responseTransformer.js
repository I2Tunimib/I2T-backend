import config from "./index.js";

const { uri } = config.public;
const { min_threshold } = config.private;

function getColumnMetadata() {
  return [
    {
      id: "wd:Q215627",
      name: "person",
      score: 1.0,
      match: true,
      type: [],
    },
  ];
}

export default async (req, res) => {
  const { result, labelDict, error } = res;
  console.log(result);
  let response = result.map((data) => {
    let doc = { id: data.row + "$" + data.colName };
    if (data.items.length == 0) {
      doc["metadata"] = [];
    } else {
      let first = true;
      doc["metadata"] = data.items.map((item) => {
        if (item.confidence < min_threshold || first === false) {
          return {
            id: "atokaPeople:" + item["id"],
            name: item["name"],
            type: [{ id: "wd:Q215627", name: "person" }],
            score: item["confidence"],
            match: false,
          };
        } else {
          first = false;
          return {
            id: "atokaPeople:" + item["id"],
            name: item["name"],
            type: [{ id: "wd:Q215627", name: "person" }],
            score: item["confidence"],
            match: true,
          };
        }
      });
    }
    return doc;
  });

  let header = {};
  header.id = result[0].colName;
  header.metadata = getColumnMetadata();
  response.push(header);

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
