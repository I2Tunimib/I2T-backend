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

/*function getCellMetadata(item, label, prop){
  if(label === ""){
    return [];
  }else{
     return [{
      id: "",
      name: "",
      score: 100,
      match: true,
      unit
    }];
  }
}*/



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
      //entity:[] mettere la riconciliazione della label
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


    response.columns[prop].metadata[0] = {
      "id": "path_"+start_label+"_"+end_label,
      "name": prop,
      "type": [{ "id": "Q29934271",
      "match" : true,
      "name" : "Quantity",
      "score" : 100,}],
      "property": colProperty
    }


    res.forEach(item_res => {
      let row_id = RowDict[item_res.origin.toString() + item_res.destination.toString()];
      let label_result = getPropRoute(item_res, prop)
      response.columns[prop].cells[row_id] = {
        label: label_result,
        metadata: []
        //metadata: getCellMetadata(item_res,label_result, prop)
      }
    });
  });
  return response;
}


