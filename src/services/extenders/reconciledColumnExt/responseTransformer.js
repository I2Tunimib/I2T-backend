import fetch from "node-fetch";
import fs from "fs";

// OLD IMPLEMENTATION FUNCTIONS (when selectedColumns is passed)
function getNameOld(row) {
  let result = "";
  if (row[1] !== []) {
    row[1].forEach((element) => {
      if (element.match === true) {
        result = element.name.value;
      }
    });
  } else {
    return "";
  }
  return String(result);
}

function getIdOld(row) {
  let result = "";
  if (row[1] !== []) {
    row[1].forEach((element) => {
      if (element.match === true) {
        result = element.id.split(":")[1];
      }
    });
  } else {
    return "";
  }
  return String(result);
}

function getRowDictOld(column) {
  let dict = {};
  Object.keys(column).forEach((row) => {
    if (column[row] !== undefined) {
      dict[row] = {
        name: getNameOld(column[row]),
        id: getIdOld(column[row]),
      };
    }
  });
  return dict;
}

// NEW IMPLEMENTATION FUNCTIONS (when selectedColumns is NOT passed)
function getNameNew(metaObj) {
  if (metaObj.name) {
    if (metaObj.name.value) return metaObj.name.value;
    else return "N/A";
  } else return "N/A";
}

function getIdNew(metaObj) {
  if (metaObj.kbId) {
    if (metaObj.kbId.startsWith("http")) return metaObj.kbId;
    else
      return (
        metaObj.kbId.includes(":") ? metaObj.kbId.split(":", 2)[1] : "N/A"
      ).trim();
  }
  return;
}

async function getRowDictNew(column) {
  const dict = {};
  for (const row of Object.keys(column)) {
    if (column[row] !== undefined) {
      dict[row] = {
        name: await getNameNew(column[row]),
        id: getIdNew(column[row]),
      };
    }
  }
  return dict;
}

// COMMON FUNCTION
function getLabel(dict, prop, row) {
  return dict[row][prop];
}

export default async (req, res) => {
  const { items, props } = req.original;
  const { selectedColumns } = props;
  const property = res.property;

  let response = {
    columns: {},
    meta: {},
  };
  console.log("*** selected columns", selectedColumns);
  // OLD IMPLEMENTATION (when selectedColumns is passed)
  if (
    selectedColumns &&
    selectedColumns.length > 0 &&
    typeof selectedColumns[0] !== "string"
  ) {
    selectedColumns.forEach((col) => {
      property.forEach((prop) => {
        let label_column = prop + "_" + col;
        console.log("label_column", label_column);
        response.columns[label_column] = {
          label: label_column,
          metadata: [],
          cells: {},
        };

        const columnData = items[col];
        const dictRow = getRowDictOld(columnData);

        Object.entries(columnData).forEach(([row_id]) => {
          let label_result = getLabel(dictRow, prop, row_id);
          console.log("label_result", label_result);
          response.columns[label_column].cells[row_id] = {
            label: label_result,
            metadata: [],
          };
        });
      });
    });
  }
  // NEW IMPLEMENTATION (when selectedColumns is NOT passed)
  else {
    const columns = Object.keys(items);

    for (const col of columns) {
      for (const prop of property) {
        const label_column = `${prop}_${col}`;
        response.columns[label_column] = {
          label: label_column,
          metadata: [],
          cells: {},
        };

        const columnData = items[col];
        const dictRow = await getRowDictNew(columnData);

        for (const row_id of Object.keys(columnData)) {
          const label_result = getLabel(dictRow, prop, row_id);
          response.columns[label_column].cells[row_id] = {
            label: label_result,
            metadata: [],
          };
        }
      }
    }
  }

  return response;
};
