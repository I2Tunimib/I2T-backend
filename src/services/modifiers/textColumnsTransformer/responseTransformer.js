export default async (req) => {
  const { items, props } = req.original;
  const { operationType, columnToJoin, separator, renameJoinedColumn, renameNewColumnSplit, selectedColumns,
    splitMode, binaryDirection, splitRenameMode } = props;

  const sep = separator || "; ";
  const response = { columns: {}, meta: {} };

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected before running the operation.");
  }

  if (operationType === "joinOp") {
    const allColumnsToJoin = [...selectedColumns, ...Object.keys(columnToJoin || {})];

    if (allColumnsToJoin.length < 2) {
      throw new Error("At least two columns must be selected for join operation.");
    }

    const newColName = renameJoinedColumn && renameJoinedColumn.trim() !== ""
      ? renameJoinedColumn.trim()
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
          } else if (columnToJoin?.[col]) {
            const cell = columnToJoin[col]?.[rowId];
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

    let maxParts;
    let extractParts;

    if (splitMode === "separatorAll") {
      const separatorFound = rowEntries.some(([_, val]) => (val?.[0] ?? "").includes(sep));
      if (!separatorFound) {
        throw new Error(`Invalid separator: '${sep}' not found in any cell.`);
      }

      const splitSamples = rowEntries.map(([_, val]) => String(val?.[0] ?? "").split(sep));
      maxParts = Math.max(...splitSamples.map((p) => p.length));
      extractParts = (raw) => raw.split(sep);

    } else if (splitMode === "separatorBinary") {
      maxParts = 2;

      extractParts = raw => {
        const value = String(raw);
        let index = "";

        if (!value.includes(sep)) {
          return [value, ""];
        }

        if (binaryDirection === "left") {
          index = value.indexOf(sep);
        } else if (binaryDirection === "right") {
          index = value.lastIndexOf(sep);
        }
        return [
          value.slice(0, index),
          value.slice(index + sep.length),
        ];
      };
    }

    let splitNames = [];
    if (splitRenameMode === "custom") {
      splitNames = renameNewColumnSplit
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      if (splitNames.length !== maxParts) {
        throw new Error(
          `Expected ${maxParts} column names based on the chosen separator, but got ${splitNames.length}.`
        );
      }
    } else {
      splitNames = Array.from(
        {length: maxParts},
        (_, i) => `${targetCol}_${i + 1}`
      );
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
      const parts = extractParts(raw);
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
