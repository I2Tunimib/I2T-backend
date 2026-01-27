import fs from "fs";

// OLD IMPLEMENTATION FUNCTIONS (when data has array structure with match property)
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

// NEW IMPLEMENTATION FUNCTIONS (when data has metadata object structure)
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
      const cellData = column[row];
      dict[row] = {
        name: getNameNew(cellData),
        id: getIdNew(cellData),
      };
    }
  }
  return dict;
}

// COMMON FUNCTION
function getLabel(dict, prop, row) {
  if (dict[row] && dict[row][prop] !== undefined) {
    return dict[row][prop];
  }
  return "";
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

  // Determine data source and which columns to process
  let dataSource;
  let columnsToProcess = [];

  if (
    selectedColumns &&
    selectedColumns.length > 0 &&
    typeof selectedColumns[0] !== "string"
  ) {
    // OLD UI path: selectedColumns passed with column objects
    dataSource = items;
    columnsToProcess = selectedColumns;
  } else if (props.column) {
    // PYTHON LIBRARY path: no selectedColumns, data is in props.column
    dataSource = props.column;
    columnsToProcess = Object.keys(items);
  } else {
    // NEW UI path: no selectedColumns, process all items
    dataSource = items;
    columnsToProcess = Object.keys(items);
  }

  for (const col of columnsToProcess) {
    const columnData =
      dataSource === props.column ? dataSource : dataSource[col];

    if (!columnData || Object.keys(columnData).length === 0) continue;

    // Auto-detect data structure by checking first row
    const firstRowKey = Object.keys(columnData)[0];
    const firstRow = columnData[firstRowKey];

    // Check if it's OLD structure (array with match property)
    const isOldStructure =
      Array.isArray(firstRow) && firstRow[1] && Array.isArray(firstRow[1]);

    if (isOldStructure) {
      // Use OLD implementation
      for (const prop of property) {
        let label_column = prop + "_" + col;
        console.log("label_column", label_column);
        response.columns[label_column] = {
          label: label_column,
          metadata: [],
          cells: {},
        };

        const dictRow = getRowDictOld(columnData);

        Object.entries(columnData).forEach(([row_id]) => {
          let label_result = getLabel(dictRow, prop, row_id);
          console.log("label_result", label_result);
          response.columns[label_column].cells[row_id] = {
            label: label_result,
            metadata: [],
          };
        });
      }
    } else {
      // Use NEW implementation (metadata object structure)
      for (const prop of property) {
        const label_column = `${prop}_${col}`;
        response.columns[label_column] = {
          label: label_column,
          metadata: [],
          cells: {},
        };

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
