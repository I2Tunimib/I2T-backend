function getElementCodeFromUrl(url) {
  const url_split = url.split('/');
  if (url_split[2] === 'www.wikidata.org') {
      return url_split[url_split.length - 1];
  }
  return undefined
}



function getCellMetadata(entityid, entityName) {
  let metadata = [];
  if (entityid === undefined || entityName === undefined) {
      return [];
  }
  entityid = getElementCodeFromUrl(entityid)
  if (entityid === undefined) return [];
  metadata = [{
      id: "wd:" + entityid,
      name: entityName,
      score: 100,
      match: true
  }];
  return metadata;
}

function getResponseDict(res, items, colIndex, property) {
  const responseDict = []
  Object.keys(items[colIndex]).forEach((id) => {
      let [prefix, id_code] = id.split(':');

      property.forEach((prop) => {
          let propertyLabel = "";
          const value = [];
          const valueLabel = [];
          res.forEach((resRow) => {
              if (id_code === getElementCodeFromUrl(resRow.values.value)
                  && prop === getElementCodeFromUrl(resRow[prop].value)) {
                  propertyLabel = resRow[prop + "Label"].value;
                  if (resRow["values" + prop] !== undefined) {
                      value.push(resRow["values" + prop].value);
                      valueLabel.push(resRow["values" + prop + "Label"].value);
                  }
              }
          });

          console.log(responseDict)

          responseDict.push({
              'id': id_code,
              'property': prop,
              'property_label': propertyLabel,
              'value': value,
              'value_label': valueLabel
          });
      });
  });

  return responseDict;
}

export default async (req, res) => {
  const { items, props } = req.processed;
  //let  prop  = props.property;


  const inputColumns = Object.keys(items);

  let response = {
      columns: {},
      meta: {}
  };

  res.forEach((serviceResponse, colIndex) => {
      const prop = serviceResponse.pop().prop;
      const responseDict = getResponseDict(serviceResponse, items, inputColumns[colIndex], prop);

      prop.forEach((property) => {

          const propertyLabel = (responseDict.find(item => {
              return item.property === property;
          }).property_label);

          const colId = inputColumns[colIndex] + "_" + propertyLabel;


          // create columns
          response.columns[colId] = {
              label: colId,
              metadata: [],
              cells: {}
          }

          response.meta = {
              ...response.meta,
              [colId]: inputColumns[colIndex]
          }

          //recupero tutti i rows id per poi riempire le celle
          const rows = req.original.items[inputColumns[colIndex]];



          Object.keys(rows).forEach((id) => {
              let entityid = rows[id].split(':')[1];
              let row_label = "";
              let metadata_row = [];

              const entityData = (responseDict.find(item => {
                  return item.id === entityid && item.property === property;
              }));


              if (entityData.value[0] !== undefined) {
                  row_label = entityData.value_label[0];
                  metadata_row = getCellMetadata(entityData.value[0], entityData.value_label[0]);
              }
              response.columns[colId].cells[id] = {
                  label: row_label,
                  metadata: metadata_row
              }
          });
      });
  });
  return response;

}