export default async (req) => {
  const { items, props } = req.original;
  const { separator, selectedColumns } = props;
  const sep = separator || ", ";

  if (!selectedColumns || selectedColumns.length !== 1) {
    throw new Error("Exactly one column must be selected for the split-to-rows operation.");
  }

  const targetCol = selectedColumns[0];
  const allColumns = Object.keys(items);

  const rows = {};
  let newRowId = 1;

  const originalRowEntries = Object.entries(items[targetCol]);
  const separatorFound = originalRowEntries.some(([_, val]) => (val?.[0] ?? "").includes(sep));
  if (!separatorFound) {
    throw new Error(`Invalid separator: '${sep}' not found in any cell.`);
  }

  const originalRowIds = Object.keys(items[targetCol]);
  originalRowIds.forEach((rowId) => {
    const rawValue = items[targetCol][rowId]?.[0] ?? "";
    const parts = String(rawValue)
      .split(sep)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    parts.forEach((part) => {
      const newId = `r${newRowId++}`;
      rows[newId] = {
        id: newId,
        cells: {},
      };
      allColumns.forEach((col) => {
        const originalCell = items[col][rowId] ?? [];
        rows[newId].cells[col] = {
          label: col === targetCol ? part : originalCell[0] ?? "",
          metadata: originalCell[1] ?? [],
        };
      });
    });
  });

  return { rows };
};
