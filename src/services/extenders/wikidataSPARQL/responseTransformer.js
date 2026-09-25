export default async (req, res) => {
  const { items, props } = req.original;

  const sparqlData = res?.data || [];
  const fetchedProps = res?.properties || [];

  const newCols = props.variables
    .split(/\s+/)
    .map(v => v.replace('?', ''))
    .filter(v => v.length > 0);

  // Extract row mapping from columnName
  const columnName = Object.keys(items)[0]; // Extract the first key (e.g., "Museum")
  console.log("********** response Column name:", columnName);
  const rowMapping = {};
  Object.entries(items[columnName]).forEach(([rowKey, itemValue]) => {
    // Extract the Qxxx part from the "wd:Qxxx" format
    const itemId = itemValue.split(":")[1];
    rowMapping[itemId] = rowKey;
  });

  let response = {
    columns: {},
    meta: {},
    originalColMeta: {
      originalColName: columnName,
      properties: []
    }
  };

  // Check if res is undefined or empty
  if (sparqlData.length === 0) {
    console.warn("No results returned from SPARQL query");
    return response;
  }

  // Iterate over the array `res` to populate columns
  sparqlData.forEach((entry) => {
    Object.entries(entry).forEach(([key, value]) => {
      // Skip source column variables - these should not be returned as new columns
      if (key === "item" || key === "itemLabel" || key === "itemDescription") {
        return; // Skip processing for source column variables
      }

      // Ensure the column exists
      if (!response.columns[key]) {
        const colIndex = newCols.indexOf(key);
        const propData = fetchedProps[colIndex] || { id: "P_UNKNOWN", label: key };
        response.columns[key] = {
          label: key,
          metadata: [],
          cells: {},
        };

        if (!response.originalColMeta.properties.some(p => p.obj === key)) {
          response.originalColMeta.properties.push({
            id: `wd:${propData.id}`,
            obj: key,
            name: propData.label,
            match: true,
            score: 100
          });
        }

        response.meta[key] = columnName;
      }

      // Populate the cell for the current row and column
      const itemId = entry.item.split("/").pop(); // Extract Qxxx from the URL
      const rowKey = rowMapping[itemId];
      if (rowKey) {
        response.columns[key].cells[rowKey] = {
          label: value,
          metadata: [],
        };
      }
    });
  });

  return response;
};
