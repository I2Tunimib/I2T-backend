function editRowDict(RowDict) {
  let newRowDict = {};
  Object.keys(RowDict).forEach(row => {
    newRowDict[RowDict[row].origin.toString() + RowDict[row].destination.toString()] = row;
  })
  return newRowDict
}

function getPropRoute(item, prop) {
  if (item.routes.length) {
    if (prop === "duration") {
      return (item.routes[0].sections[0].summary[prop] / 60).toFixed(2);
    }
    if (prop === "length") {
      return (item.routes[0].sections[0].summary[prop] / 1000).toFixed(2);
    }
    if (prop == "route") {
      return item.routes[0].sections[0].polyline.toString();
    }
  }
  return "";
}

export default async (req, res) => {
  const { props, items } = req.original;
  const property = props.property;

  const sourceColId = Object.keys(items)[0];
  const destinationColId = props.end[Object.keys(props.end)[0]][2];

  //const RowDict = editRowDict(res.dict);
  const start_label = res.start;
  const end_label = res.end;
  const dict = res.dict
  res = res.data;

  let response = {
    columns: {},
    meta: {},
    originalColMeta: {
      originalColName: sourceColId,
      types: [],
      properties: []
    }
  };

  response.originalColMeta.types.push({
    id: "wd:Q529711",
    name: "beginning",
    match: true,
    score: 100
  });

  response.originalColMeta.properties.push({
    id: "wd:P1444",
    obj: destinationColId,
    name: "destination point",
    match: true,
    score: 100
  });

  property.forEach(prop => {
    response.columns[prop] = {
      label: prop,
      kind: prop === "route" ? "entity" : "literal",
      datatype: prop === "route" ? "OTHER" : "NUMBER",
      entity: [],
      metadata: [],
      cells: {}
    }

    let propId = "";
    let propLabel = "";

    if (prop === "duration") {
      propId = "wd:P2047";
      propLabel = "duration";
    } else if (prop === "length") {
      propId = "wd:P2043";
      propLabel = "distance";
    } else {
      propId = "wd:P2825";
      propLabel = "via";
    }

    response.originalColMeta.properties.push({
      id: propId,
      obj: prop,
      name: propLabel,
      match: true,
      score: 100
    });

    let colType = [];
    if (prop === "duration") {
      colType = [
        {
          "id": "wd:Q7727",
          "name": "minute",
          "match": true,
          "score": 100
        }
        ];
    } else if (prop === "length") {
      colType = [
        {
          "id": "wd:Q828224",
          "name": "kilometre",
          "match": true,
          "score": 100
        }
      ];
    } else {
      colType = [
        {
          "id": "wd:Q111226201",
          "name": "MultiLineString",
          "match": true,
          "score": 100
        }
      ];
    }

    response.columns[prop].metadata[0] = {
      "id": "path_" + start_label + "_" + end_label,
      "name": prop,
      "entity": [],
      "type": colType,
      "property": []
    }

    Object.keys(dict).forEach(index => {
      let row_id = dict[index];
      let label_result = getPropRoute(res[index], prop)
      if (prop !== "route") {
        response.columns[prop].cells[row_id] = {
          label: label_result,
          metadata: []
        }
      } else {
        response.columns[prop].cells[row_id] = {
          label: label_result,
          metadata: [{
            'id': String("georss:" + label_result),
            'feature': [{ 'id': 'all_labels', 'value': 100 }],
            'name': label_result,
            'score': 1,
            'match': true,
            'type': [{'id': "wd:Q111226201", 'name': "MultiLineString" }]
          }]
        };
      }
    });
    response.meta[prop] = sourceColId;
  });
  console.log(response)
  return response;
}


