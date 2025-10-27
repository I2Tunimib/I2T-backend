export default async (req, res) => {
  const { items, props } = req.original;
  const { operationType, columnToJoinSplit, separator, renameNewColumn, selectedColumns } = props;

  const sep = separator || "; ";
  const response = { columns: {}, meta: {} };

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected before running the operation.");
  }

  if (operationType === "joinOp") {
    const allColumnsToJoin = [...selectedColumns, ...Object.keys(columnToJoinSplit || {})];

    if (allColumnsToJoin.length < 2) {
      throw new Error("At least two columns must be selected for join operation.");
    }

    const newColName = renameNewColumn && renameNewColumn.trim() !== ""
      ? renameNewColumn.trim()
      : `${allColumnsToJoin.join("_")}`;

    response.columns[newColName] = {
      label: newColName,
      kind: "",
      metadata: [],
      cells: {},
    };

    const rowIds = Object.keys(items[allColumnsToJoin[0]]);

    rowIds.forEach((rowId) => {
      const joinedValue = allColumnsToJoin
        .map((col) => {
          if (selectedColumns.includes(col)) {
            const cell = items[col]?.[rowId];
            return cell ? String(cell[0]) : "";
          } else if (columnToJoinSplit?.[col]) {
            const cell = columnToJoinSplit[col]?.[rowId];
            return cell ? String(cell[0]) : "";
          }
          return "";
        })
        .join(sep);

      response.columns[newColName].cells[rowId] = { label: joinedValue, metadata: [] };
    });
    return response;
  } else if (operationType === "splitOp") {
    if (selectedColumns.length !== 1) {
      throw new Error("Exactly one column must be selected for split operation.");
    }

    const targetCol = selectedColumns[0];
    const rowEntries = Object.entries(items[targetCol]);
    if (rowEntries.length === 0) {
      throw new Error("Selected column contains no data.");
    }

    const separatorFound = rowEntries.some(([_, val]) => (val?.[0] ?? "").includes(sep));
    if (!separatorFound) {
      throw new Error(`Invalid separator: '${sep}' not found in any cell.`);
    }

    const splitSamples = rowEntries.map(([_, val]) => String(val?.[0] ?? "").split(sep));
    const maxParts = Math.max(...splitSamples.map((p) => p.length));

    let splitNames = [];
    if (renameNewColumn && renameNewColumn.trim() !== "") {
      splitNames = renameNewColumn.split(",").map((n) => n.trim());
    }
    while (splitNames.length < maxParts) {
      splitNames.push(`${targetCol}_${splitNames.length + 1}`);
    }
    splitNames.forEach((name) => {
      response.columns[name] = {
        label: name,
        kind: "",
        metadata: [],
        cells: {},
      };
    });

    rowEntries.forEach(([rowId, val]) => {
      const raw = String(val?.[0] ?? "");
      const parts = raw.split(sep);
      splitNames.forEach((colName, i) => {
        response.columns[colName].cells[rowId] = {
          label: parts[i] ?? "",
          metadata: [],
        };
      });
    });
    return response;
  }
};
