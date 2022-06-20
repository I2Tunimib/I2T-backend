function editRowDict(RowDict) {
  let newRowDict = {};
  Object.keys(RowDict).forEach(row => {
    newRowDict[RowDict[row].origin.toString() + RowDict[row].destination.toString()] = row;
  })
  return newRowDict
}

function getPropRoute(item, prop) {
  if (item.routes.length) {
    if(prop === "duration"){
      return (item.routes[0].sections[0].summary[prop]/60).toFixed(2).toString();
    }
    if(prop === "length"){
      return (item.routes[0].sections[0].summary[prop]/1000).toFixed(2).toString();
    }
    return item.routes[0].sections[0].summary[prop].toString();
  }
  return "";
}




export default async (req, res) => {
  const { props } = req.original;
  const property = props.property;

  const RowDict = editRowDict(res.dict);
  const start_label =res.start;
  const end_label =res.end;
  res = res.data;

  let response = {
    columns: {},
    meta: {}
  }



  property.forEach(prop => {
    response.columns[prop] = {
      label: prop,
      kind: 'literal',
      entity:[],
      metadata: [],
      cells: {}
    }

    const colProperty = [{ 
      id: 'P1427',
      obj: start_label,
      match: true,
      name: 'start point',
      score: 100
    },
    { 
      id: 'P1444',
      obj: end_label,
      match: true,
      name: 'destination point',
      score: 100
    }];

    let colType = "";
    let colEntity = "";
    if(prop === "duration"){
      colType = [{ "id": "wd:Q29934271",
      "match" : true,
      "name" : "Quantity",
      "score" : 100},
      {
        "id": "wd:Q7727",
        "name": "minute",
        "match": true,
        "score": 100
      }];
      colEntity = [
        {
          "name":"duration",
          "id":"wd:Q2199864",
          "score":100,
          "match": true
        }
      ];
    }else{
      colType = [{ "id": "wd:Q29934271",
      "match" : true,
      "name" : "Quantity",
      "score" : 100},
      {
        "id": "wd:Q828224",
        "name": "kilometre",
        "match": true,
        "score": 100
      }];
      colEntity = [
        {
          "name":"length",
          "id":"wd:Q36253",
          "score":100,
          "match": true
        }
      ];
    }


    response.columns[prop].metadata[0] = {
      "id": "path_"+start_label+"_"+end_label,
      "name": prop,
      "entity": colEntity,
      "type": colType,
      "property": colProperty
    }

    
    


    

    res.forEach(item_res => {
      let row_id = RowDict[item_res.origin.toString() + item_res.destination.toString()];
      let label_result = getPropRoute(item_res, prop)
      response.columns[prop].cells[row_id] = {
        label: label_result,
        metadata: []
      }
    });
  });
  return response;
}


