export default async (req, res) => {
  const { items, props } = req.original;
  const { selectedColumns } = props;
  const { result } = res;

  const response = { columns: {}, meta: {} };

  selectedColumns.forEach((col) => {
    const columnData = items[col] || {};

    response.columns[col] = {
      label: col,
      kind: "literal",
      metadata: [],
      cells: {},
    };

    Object.entries(columnData).forEach(([rowId, val]) => {
      const label = String(val?.[0] ?? "");
      const annotationResult = result[col]?.[rowId] || {};
      response.columns[col].cells[rowId] = {
        label,
        metadata: [],
        annotations: annotationResult.annotations || {},
      };
    });
  });

  return response;
};
