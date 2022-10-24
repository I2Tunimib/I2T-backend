function getAddress(data) {
  return data["item"]["base"]["registeredAddress"]["fullAddress"];
}

function getTaxID(data) {
  return data["item"]["base"]["taxId"];
}

function getAteco(data) {
  return data["item"]["base"]["ateco"][0]["code"];
}


function getAssets(data) {
  let assets = "";
  if (data["item"]["economics"]["balanceSheets"] === undefined) {
    return ""
  } else {
    data = data["item"]["economics"]["balanceSheets"];
    data.forEach(item => {
      if (item["latest"] === true) {
        assets = item["assets"];
      }
    });
    return assets


  }
}

function getNameCeo(data) {
  return data["item"]["people"]["items"][0]["name"]
}

function getWebsites(data){
  if(data["item"]["web"]["websites"] !== undefined){
    return String(data["item"]["web"]["websites"][0]["url"])
  }else{
    return ""
  }
}

export default async (req, res) => {

  const { props } = req.processed;
  const property = props["property"];

  const column_to_extend = Object.keys(req.processed.items)[0];

  let response = {
    columns: {},
    meta: {}
  }

  property.forEach(prop => {
    let label_column = prop + "_" + column_to_extend;
    let colEntity = [];
    let colProperty = [];
    let colType = [];

    console.log(column_to_extend)

    //ENTITY COL

    if (String(prop) === "fullAddress") {
      colEntity = [{
        "name": "address",
        "id": "wd:Q319608",
        "score": 100,
        "match": true
      }];
      colProperty = [{
        id: 'wd:P144',
        obj: column_to_extend,
        match: true,
        name: 'based on',
        score: 100
      },
      {
        id: 'wd:P6375',
        obj: column_to_extend,
        match: true,
        name: 'street address',
        score: 100
      }];
      colType = [
        {
          "id": "wd:Q319608",
          "name": "address",
          "match": true,
          "score": 100
        }];
    } else {
      if (String(prop) === "assets") {
        colEntity = [{
          "name": "asset",
          "id": "wd:Q46737",
          "score": 100,
          "match": true
        }];
        colProperty = [{
          id: 'wd:P144',
          obj: column_to_extend,
          match: true,
          name: 'based on',
          score: 100
        }, {
          id: 'wd:P2403',
          obj: column_to_extend,
          match: true,
          name: 'total assets',
          score: 100
        }];
        colType = [
          {
            "id": "wd:Q4916",
            "name": "euro",
            "match": true,
            "score": 100
          }];
      } else {
        if (String(prop) === "ateco") {
          colEntity = [{
            "name": "ateco",
            "id": "wd:Q21614754",
            "score": 100,
            "match": true
          }];
          colProperty = [{
            id: 'wd:P144',
            obj: column_to_extend,
            match: true,
            name: 'based on',
            score: 100
          }];
          colType = [
            {
              "id": "wd:Q853614",
              "name": "identifier",
              "match": true,
              "score": 100
            }];
        } else {
          if (String(prop) === "ceo") {
            colEntity = [{
              "name": "given name",
              "id": "wd:Q202444",
              "score": 100,
              "match": true
            }];
            colProperty = [{
              id: 'wd:P144',
              obj: column_to_extend,
              match: true,
              name: 'based on',
              score: 100
            }];
            colType = [
              {
                "id": "wd:Q184754",
                "name": "string",
                "match": true,
                "score": 100
              }];
          } else {
            if (String(prop) === "websites") {
              colEntity = [{
                "name": "taxpayer identification number",
                "id": "wd:Q47159572",
                "score": 100,
                "match": true
              }];
              colProperty = [{
                id: 'wd:P144',
                obj: column_to_extend,
                match: true,
                name: 'based on',
                score: 100
              }];
              colType = [
                {
                  "id": "wd:Q47159572",
                  "name": "taxpayer identification number",
                  "match": true,
                  "score": 100
                }];
            } else {
              colEntity = [{
                "name": "taxpayer identification number",
                "id": "wd:Q47159572",
                "score": 100,
                "match": true
              }];
              colProperty = [{
                id: 'wd:P144',
                obj: column_to_extend,
                match: true,
                name: 'based on',
                score: 100
              }];
              colType = [
                {
                  "id": "wd:Q47159572",
                  "name": "taxpayer identification number",
                  "match": true,
                  "score": 100
                }];
            }
          }
        }
      }
    }

    response.columns[label_column] = {
      label: label_column,
      kind: 'literal',
      metadata: [],
      cells: {}
    };


    response.columns[label_column].metadata.push({
      "id": label_column,
      "name": label_column,
      "entity": colEntity,
      "type": colType,
      "property": colProperty
    });

    res[0].forEach(row => {
      let label_result = ""
      if (String(prop) === "fullAddress") {
        label_result = getAddress(row)
      } else {
        if (String(prop) === "assets") {
          label_result = getAssets(row);
        } if (String(prop) === "ateco") {
          label_result = getAteco(row);
        } else {
          if (String(prop) === "ceo") {
            label_result = getNameCeo(row);
          } else {
            if(String(prop) === "websites"){
              label_result = getWebsites(row);
            }else{
              label_result = getTaxID(row);
            }
          }
        }
      }
      response.columns[label_column].cells[row["row"]] = {
        label: label_result,
        metadata: []
      }
    });



  })


  return response;
}


