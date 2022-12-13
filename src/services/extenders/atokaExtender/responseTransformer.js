function getAddress(data) {
  return data["item"]["base"]["registeredAddress"]["fullAddress"];
}

function getTaxID(data) {
  return data["item"]["base"]["taxId"];
}

function getAteco(data) {
  try{
    return data["item"]["base"]["ateco"][0]["code"];
  }catch(error){
    return ""
  }
  
}

function getEmployees(data) {
  let employees = "";
  if (data["item"]["economics"]["employees"] === undefined) {
    return ""
  } else {
    data = data["item"]["economics"]["employees"];
    data.forEach(item => {
      if (item["latest"] === true) {
        employees = item["value"];
      }
    });
    return employees;
  }
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

function getRevenue(data) {
  let revenue = "";
  if (data["item"]["economics"]["balanceSheets"] === undefined) {
    return ""
  } else {
    data = data["item"]["economics"]["balanceSheets"];
    data.forEach(item => {
      if (item["latest"] === true) {
        revenue = item["revenue"];
      }
    });
    return revenue


  }
}

function getProfit(data) {
  let profit = "";
  if (data["item"]["economics"]["balanceSheets"] === undefined) {
    return ""
  } else {
    data = data["item"]["economics"]["balanceSheets"];
    data.forEach(item => {
      if (item["latest"] === true) {
        profit = item["profit"];
      }
    });
    return profit


  }
}

function getPurchases(data) {
  let purchases = "";
  if (data["item"]["economics"]["balanceSheets"] === undefined) {
    return ""
  } else {
    data = data["item"]["economics"]["balanceSheets"];
    data.forEach(item => {
      if (item["latest"] === true) {
        purchases = item["purchases"];
      }
    });
    return purchases
  }
}

function getWebsites(data) {
  if (data["item"]["web"]["websites"] !== undefined) {
    return String(data["item"]["web"]["websites"][0]["url"])
  } else {
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


    //ENTITY COL

    switch (String(prop)) {
      case "fullAddress":
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
        break;
      case "assets":
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
        break;
      case "ateco":
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
        break;
      case "ceo":
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
        break;
      case "websites":
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
        break;
      case "taxId":
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
        break;
      case "revenue":
        colEntity = [{
          "name": "revenue",
          "id": "wd:Q850210",
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
          id: 'wd:P2139',
          obj: column_to_extend,
          match: true,
          name: 'total revenue',
          score: 100
        }];
        colType = [
          {
            "id": "wd:Q4916",
            "name": "euro",
            "match": true,
            "score": 100
          }];
        break;
      case "purchases":
        colEntity = [{
          "name": "purchases",
          "id": "wd:Q1369832",
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
            "id": "wd:Q4916",
            "name": "euro",
            "match": true,
            "score": 100
          }];
        break;
      case "profit":
        colEntity = [{
          "name": "profit",
          "id": "wd:Q2112073",
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
          id: 'wd:P2295',
          obj: column_to_extend,
          match: true,
          name: 'net profit',
          score: 100
        }];
        colType = [
          {
            "id": "wd:Q4916",
            "name": "euro",
            "match": true,
            "score": 100
          }];
        break;
      case "purchases":

        colEntity = [{
          "name": "purchases",
          "id": "wd:Q1369832",
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
            "id": "wd:Q4916",
            "name": "euro",
            "match": true,
            "score": 100
          }];
        break;
      case "employees":
        colEntity = [{
          "name": "employee",
          "id": "wd:Q703534",
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
          id: 'wd:P1128',
          obj: column_to_extend,
          match: true,
          name: 'employees',
          score: 100
        }];
        colType = [
          {
            "id": "wd:Q12503",
            "name": "integer",
            "match": true,
            "score": 100
          }];
        break;
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
      let label_result = "";
      switch (String(prop)) {
        case "fullAddress":
          label_result = getAddress(row)
          break;
        case "ateco":
          label_result = getAteco(row);
          break;
        case "assets":
          label_result = getAssets(row);
          break;
        case "ceo":
          label_result = getNameCeo(row);
          break;
        case "websites":
          label_result = getWebsites(row);
          break;
        case "taxId":
          label_result = getTaxID(row);
          break;
        case "revenue":
          label_result = getRevenue(row);
          break;
        case "purchases":
          label_result = getPurchases(row);
          break;
        case "profit":
          label_result = getProfit(row);
          break;
        case "employees":
          label_result = getEmployees(row);
          break;
      }

      response.columns[label_column].cells[row["row"]] = {
        label: label_result,
        metadata: []
      }
    });



  })


  return response;
}


