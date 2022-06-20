function getName(row) {
  if (row[1][0] !== undefined) {
    return row[1][0].name.value;
  } else {
    return "";
  }
}

function getCoordinates(row) {
  if (row[1][0] !== undefined) {
    return row[1][0].id.split(":")[1];
  } else {
    return "";
  }
}

function getRowDict(column) {
  let dict = {}
  Object.keys(column).forEach(row => {
    if (column[row] !== undefined) {
      dict[row] = {
        "english_name": getName(column[row]),
        "geocoordinates": getCoordinates(column[row])
      };
    }
  })
  return dict;
}

function getLabel(dict, prop, row) {
  return dict[row][prop];
}





export default async (req, res) => {
  const { column } = res;
  const property = res.property;

  const column_to_extend = column[Object.keys(column)[0]][2];


  const dictRow = getRowDict(column);


  let response = {
    columns: {},
    meta: {}
  }



  property.forEach(prop => {
    let label_column = prop +"_"+column_to_extend;
    let colProperty ="";
    let colEntity = {};

    if (String(prop) === "geocoordinates") {
      colEntity = [{
        "name":"GlobeCoordinate",
        "id":"wd:Q29934236",
        "score":100,
        "match": true
      }];
    }else{
      colEntity = [{
        "name":"translation",
        "id":"wd:Q7553",
        "score":100,
        "match": true
      }];
    }

    

    response.columns[label_column] = {
      label: label_column,
      kind: 'literal',
      metadata: [],
      cells: {}
    };

    console.log(prop)

    if (String(prop) === "geocoordinates") {
      colProperty = [{
        id: 'wd:P625',
        obj: column_to_extend,
        match: true,
        name: 'coordinate location',
        score: 100
      }];
    }else{
      colProperty = [{
        id: 'wd:P5972',
        obj: column_to_extend,
        match: true,
        name: 'translation',
        score: 100
      }];
    }

    let type = {};

    if (String(prop) === "geocoordinates") {
      type = [{
        "id": "wd:Q29934236",
        "match": true,
        "name": "GlobeCoordinate",
        "score": 100,
      }];
    }else{
      type = [{
        "id": "wd:Q7553",
        "match": true,
        "name": "translation",
        "score": 100,
      }];
    }


    response.columns[label_column].metadata.push({
      "id": label_column,
      "name": label_column,
      "entity": colEntity,
      "type": type,
      "property": colProperty
    });


    Object.keys(res.column).forEach(row_id => {
      let label_result = getLabel(dictRow, prop, row_id);
      response.columns[label_column].cells[row_id] = {
        label: label_result,
        metadata: []
      }
    });
  });

  return response;
}


