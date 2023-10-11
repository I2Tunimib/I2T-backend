function getCount(data) {
  if (data["item"]["companies"]["count"] !== undefined) {
    return data["item"]["companies"]["count"];
  } else {
    return "";
  }
}

function getRoles(data) {
  if (data["item"]["companies"]["items"] !== undefined) {
    let finale = [];
    data["item"]["companies"]["items"].forEach(item => {
      let temp = []
      item["roles"].forEach(role => {
        temp.push(role["name"]);
      });
      finale.push("[" + temp.toString() + "]");
    });
    return finale;
  } else {
    return "";
  }
}

function getLegalName(data) {
  if (data["item"]["companies"]["items"] !== undefined) {
    let finale = [];
    data["item"]["companies"]["items"].forEach(item => {
      finale.push("[" + item["legalName"] + "]");
    });
    return finale;
  } else {
    return "";
  }

}

function getId(data) {
  if (data["item"]["companies"]["items"] !== undefined) {
    let finale = [];
    data["item"]["companies"]["items"].forEach(item => {
      finale.push("[" + item["id"] + "]");
    });
    return finale;
  } else {
    return "";
  }

}

function getResidenceAddress(data) {
  if (data["item"]["base"]["residenceAddress"] !== undefined) {
    return data["item"]["base"]["residenceAddress"]["fullAddress"];
  } else {
    return "";
  }
}

function getAddress(data) {
  console.log(data)

  if (data["item"]["base"]["address"] !== undefined) {
    return data["item"]["base"]["address"]["fullAddress"];
  } else {
    return "";
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


    if (String(prop) === "roles") {
      colEntity = [{
        "name": "occupation",
        "id": "wd:Q12737077",
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
        id: 'wd:P106',
        obj: column_to_extend,
        match: true,
        name: 'occupation',
        score: 100
      }];
      colType = [
        {
          "id": "wd:Q12737077",
          "name": "occupation",
          "match": true,
          "score": 100
        }];
    } else {
      if (String(prop) === "count") {
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
        }];
        colType = [
          {
            "id": "wd:Q319608",
            "name": "address",
            "match": true,
            "score": 100
          }];
      } else {
        if (String(prop) === "legalName") {
          colEntity = [{
            "name": "string",
            "id": "wd:Q29934246",
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
            id: 'wd:P1448',
            obj: column_to_extend,
            match: true,
            name: 'official name',
            score: 100
          }];
          colType = [
            {
              "id": "wd:Q29934246",
              "name": "string",
              "match": true,
              "score": 100
            }];
        } else {
          if (String(prop) === "id") {
            colEntity = [{
              "name": "company",
              "id": "wd:Q7837941",
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
                "id": "wd:Q7837941",
                "name": "company",
                "match": true,
                "score": 100
              }];
          } else {
            if (String(prop) === "address") {
              colEntity = [{
                "name": "company",
                "id": "wd:Q7837941",
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
                  "id": "wd:Q7837941",
                  "name": "company",
                  "match": true,
                  "score": 100
                }];

            } else {
              colEntity = [{
                "name": "company",
                "id": "wd:Q7837941",
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
                  "id": "wd:Q7837941",
                  "name": "company",
                  "match": true,
                  "score": 100
                }];

            }
          }
        }
      }
    };


    res[0].forEach(row => {
      let label_result = ""
      if (String(prop) === "count") {
        label_result = getCount(row)
      } else {
        if (String(prop) === "roles") {
          label_result = getRoles(row);
        } else {
          if (String(prop) === "legalName") {
            label_result = getLegalName(row);
          } else {
            if (String(prop) === "id") {
              label_result = getId(row);
            } else {
              if (String(prop) === "address") {
                label_result = getAddress(row);
              } else {
                label_result = getResidenceAddress(row);
              }
            }
          }
        }
      }




      let count = 0;
      if (label_result.length > 1) {
        label_result.forEach(single_result => {
          if (response.columns[label_column + count] === undefined) {
            response.columns[label_column + count] = {
              label: label_column + count,
              kind: 'literal',
              metadata: [],
              cells: {}
            };
            response.columns[label_column + count].metadata.push({
              "id": label_column + count,
              "name": label_column + count,
              "entity": colEntity,
              "type": colType,
              "property": colProperty
            });
          }
          response.columns[String(label_column + count)].cells[row["row"]] = {
            label: single_result.toString().substr(1, single_result.lastIndexOf("]") - 1),
            metadata: []
          }
          count += 1;
        });
      } else {
        if (response.columns[label_column + "0"] === undefined) {
          response.columns[label_column + "0"] = {
            label: label_column + count,
            kind: 'literal',
            metadata: [],
            cells: {}
          };
          response.columns[label_column + "0"].metadata.push({
            "id": label_column + count,
            "name": label_column + count,
            "entity": colEntity,
            "type": colType,
            "property": colProperty
          });
        }
        if (label_result.toString().indexOf("[") !== -1) {
          response.columns[label_column + "0"].cells[row["row"]] = {
            label: label_result.toString().substr(label_result.toString().indexOf("[") + 1, label_result.toString().lastIndexOf("]") - 1),
            metadata: []
          }
        } else {
          response.columns[label_column + "0"].cells[row["row"]] = {
            label: label_result.toString(),
            metadata: []
          }
        }

      }
    });
  });



  return response;
}


