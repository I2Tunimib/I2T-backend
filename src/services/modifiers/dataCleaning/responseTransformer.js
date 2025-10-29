export default async (req, res) => {
  const { items, props } = req.original;
  const { operationType, selectedColumns } = props;

  const response = { columns: {}, meta: {} };

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected before running the operation.");
  }

  selectedColumns.forEach((col) => {
    response.columns[col] = {
      label: col,
      kind: "",
      metadata: [],
      cells: {},
    };

    const columnData = items[col];
    if (!columnData) {
      throw new Error(`Column '${col}' not found in dataset.`);
    }

    Object.entries(columnData).forEach(([rowId, val]) => {
      const raw = String(val?.[0] ?? "");
      let transformed = raw;

      switch (operationType) {
        case "trim": transformed = raw.trim(); break;
        case "removeSpecial": transformed = raw.replace(/[^a-zA-Z0-9\s]/g, ""); break;
        case "normalizeAccents": transformed = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); break;
        case "toLowercase": transformed = raw.toLowerCase(); break;
        case "toUppercase": transformed = raw.toUpperCase(); break;
        case "toTitlecase": transformed = raw .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());break;
        default: throw new Error(`Unknown operation type: ${operationType}`);
      }

      response.columns[col].cells[rowId] = {
        label: transformed,
        metadata: [],
      };
    });
  });
  return response;
}
