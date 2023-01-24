function getName(row) {
  let result = "";
  if (row[1] !== []) {
    row[1].forEach(element => {
      if(element.match === true){
        result = element.name.value;
      }
      console.log(result)
    });
  } else {
    return "";
  }
  return String(result);
}

function getId(row) {
  let result = "";
  if (row[1] !== []) {
    row[1].forEach(element => {
      if(element.match === true){
        result = element.id.split(":")[1];
      }      
    });
  } else {
    return "";
  }
  return String(result);
}

function getRowDict(column) {
  let dict = {}
  Object.keys(column).forEach(row => {
    if (column[row] !== undefined) {
      dict[row] = {
        "name": getName(column[row]),
        "id": getId(column[row])
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
  console.log(property)


  let response = {
    columns: {},
    meta: {}
  }



  property.forEach(prop => {
    let label_column = prop +"_"+column_to_extend;
 
      response.columns[label_column] = {
      label: label_column,
      kind: 'literal',
      metadata: [],
      cells: {}
    };

    Object.keys(res.column).forEach(row_id => {
      let label_result = getLabel(dictRow, prop, row_id);
      response.columns[label_column].cells[row_id] = {
        label: label_result,
        metadata: []
      }
    });
  });
  print(response['columns']['duration'])
  return response;
}


