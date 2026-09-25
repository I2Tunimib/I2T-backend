function getPropRoute(item, prop) {
  // Ok if route founded
  if (item.code === "Ok" && item.routes && item.routes.length > 0) {
    const route = item.routes[0];

    if (prop === "duration") {
      // seconds -> minutes
      return (route.duration / 60).toFixed(2);
    }
    if (prop === "length") {
      // metres -> km
      return (route.distance / 1000).toFixed(2);
    }
    if (prop === "route") {
      // Polyline
      return route.geometry;
    }
  }
  return "";
}

export default async (req, res) => {
  const { props, items } = req.original;
  const property = props.property;
  const mode = props.mode;

  const sourceColId = Object.keys(items)[0];
  const destinationColId = props.end[Object.keys(props.end)[0]][2];

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

  response.originalColMeta.properties.push({
    id: "wd:P1444",
    obj: destinationColId,
    name: "destination point",
    match: true,
    score: 100
  });

  response.originalColMeta.types.push({
    id: "wd:Q529711",
    name: "beginning",
    match: true,
    score: 100
  });

  property.forEach(prop => {
    const targetColId = `${prop}_${mode}`;

    response.columns[targetColId] = {
      label: targetColId,
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
      obj: targetColId,
      name: propLabel,
      match: true,
      score: 100
    });

    let colType = "";
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

    response.columns[targetColId].metadata = [{
      "id": "path_" + start_label + "_" + end_label + "_" + mode,
      "name": prop,
      "entity": [],
      "type": colType,
      "property": []
    }];

    Object.keys(dict).forEach((index) => {
      let row_id = dict[index];
      let label_result = getPropRoute(res[index], prop);
      if (prop !== "route") {
        response.columns[targetColId].cells[row_id] = {
          label: label_result,
          metadata: []
        };
      } else {
        response.columns[targetColId].cells[row_id] = {
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
    response.meta[targetColId] = sourceColId;
  });
  console.log(response)
  return response;
}
