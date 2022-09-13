function getName(row) {
  if (row[1][0] !== undefined) {
    return row[1][0].name.value;
  } else {
    return "";
  }
}

function getId(row) {
  if (row[1][0] !== undefined) {
    console.log()
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
  return response;
}


