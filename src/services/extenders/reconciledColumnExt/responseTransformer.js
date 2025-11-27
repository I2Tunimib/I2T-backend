import fs from "fs";

function getName(row) {
  let result = "";
  if (row[1] !== []) {
    row[1].forEach(element => {
      if(element.match === true){
        result = element.name.value;
      }
//      console.log(result)
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
  // fs.writeFile('../../fileSemTUI/requestEXT-UI-columnExt.json',
  //     JSON.stringify(req), function (err) {
  //       if (err) throw err;
  //       console.log('File ../../fileSemTUI/requestEXT-UI-columnExt.json saved!');
  //     });

  const { items, props } = req.original;
  const { selectedColumns } = props;
  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected before running the operation.");
  }
  const property = res.property;
  //  console.log(property)

  let response = {
    columns: {},
    meta: {}
  }

  selectedColumns.forEach((col) => {
    property.forEach((prop) => {
      let label_column = prop +"_"+col;
      console.log("label_column", label_column);
      response.columns[label_column] = {
        label: label_column,
        metadata: [],
        cells: {},
      };

      const columnData = items[col];
      const dictRow = getRowDict(columnData);

      Object.entries(columnData).forEach(([row_id]) => {
        let label_result = getLabel(dictRow, prop, row_id);
        console.log("label_result", label_result);
        response.columns[label_column].cells[row_id] = {
          label: label_result,
          metadata: []
        }
      });
    });
  });
  // fs.writeFile('../../fileSemTUI/responseEXT-UI-columnExt.json',
  //     JSON.stringify(response), function (err) {
  //       if (err) throw err;
  //       console.log('File ../../fileSemTUI/responseEXT-UI-columnExt.json saved!');
  //     });

  return response;
}


