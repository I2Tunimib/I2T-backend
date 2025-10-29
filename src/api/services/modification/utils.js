const mapToUnique = (column) => {
  return Object.keys(column).reduce((acc, rowId) => {
    const id = column[rowId]

    if (column[rowId] in acc) {
      acc[id] = [...acc[id], rowId];
    } else {
      acc[id] = [rowId];
    }
    return acc;
  }, {});
}

export const getUniqueMaps = (columns) => {
  return Object.keys(columns).reduce((acc, colId) => {
    acc[colId] = mapToUnique(columns[colId]);
    return acc;
  }, {});
}
