import config from "./index.js";

const { uri } = config.public;

function getInformation(item) {
  return {
    label: item.address.label,
    lat: item.position.lat,
    lng: item.position.lng,
    score: item.scoring.queryScore,
    name_eng: item.address.label,
  };
}

function getArrayInformation(items) {
  let result = [];
  items.forEach((singleItem) => {
    result.push(getInformation(singleItem));
  });
  return result;
}

function getDict(res) {
  let dict = {};
  res.forEach((item) => {
    if (item.items[0] !== undefined) {
      dict[item.address] = getArrayInformation(item.items);
    }
  });
  return dict;
}

function getMetaData(data) {
  let result = [];
  let metadata = {};
  data.forEach((singleItem) => {
    if (result.length < 1 && singleItem.score > 0.6) {
      metadata = {
        id: String("georss:" + singleItem.lat + "," + singleItem.lng),
        feature: [{ id: "all_labels", value: 100 }],
        name: singleItem.name_eng,
        score: singleItem.score,
        match: true,
        type: [
          { id: "wd:Q29934236", name: "GlobeCoordinate" },
          { id: "georss:point", name: "point" },
        ],
      };
    } else {
      metadata = {
        id: String("georss:" + singleItem.lat + "," + singleItem.lng),
        feature: [{ id: "all_labels", value: 100 }],
        name: singleItem.name_eng,
        score: singleItem.score,
        match: false,
        type: [
          { id: "wd:Q29934236", name: "GlobeCoordinate" },
          { id: "georss:point", name: "point" },
        ],
      };
    }
    result.push(metadata);
  });
  return result;
}

function getColumnMetadata() {
  return [
    {
      id: "wd:Q29934236",
      name: "GlobeCoordinate",
      score: 0,
      match: true,
      type: [],
    },
    {
      id: "georss:point",
      name: "point",
      score: 0,
      match: true,
      type: [],
    },
  ];
}

export default async (req, res) => {
  //  console.log(res.result[0]["items"])
  const { items } = req.original;

  const response = [];

  if (items.length > 1) {
    let header = {};
    header.id = items[0].id;
    header.metadata = getColumnMetadata();
    delete items[0];
    response.push(header);
  }
  const dict = getDict(res.result);

  items.forEach((item) => {
    let row = {};
    row.id = item.id;
    if (dict[res.labelDict[item.label]]) {
      row.metadata = getMetaData(dict[res.labelDict[item.label]]);
    } else {
      row.metadata = [];
    }
    response.push(row);
  });

  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      // For rows, check if any metadata has matches
      return item.metadata.some((meta) => meta.match);
    }
    return false;
  });

  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  return { ...response, error: res.error };
};
