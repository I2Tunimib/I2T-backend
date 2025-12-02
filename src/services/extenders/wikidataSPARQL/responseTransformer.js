export default async (req, res) => {
  const { items } = req.original;

  let response = {
    columns: {},
    meta: {},
  };

  // Extract row mapping from columnName
  const columnName = Object.keys(items)[0]; // Extract the first key (e.g., "Museum")
  console.log("********** response Column name:", columnName);
  const rowMapping = {};
  Object.entries(items[columnName]).forEach(([rowKey, itemValue]) => {
    // Extract the Qxxx part from the "wd:Qxxx" format
    const itemId = itemValue.split(":")[1];
    rowMapping[itemId] = rowKey;
  });

  // Check if res is undefined or empty
  if (!res || !Array.isArray(res) || res.length === 0) {
    console.warn("No results returned from SPARQL query");
    return response;
  }

  // Iterate over the array `res` to populate columns
  res.forEach((entry) => {
    Object.entries(entry).forEach(([key, value]) => {
      if (key === "item") {
        // Map item to its row (skip column creation for "item")
        const itemId = value.split("/").pop(); // Extract Qxxx from the URL
        const rowKey = rowMapping[itemId];
        if (!rowKey) {
          console.warn(`Item ${itemId} not found in row mapping.`);
        }
        return; // Skip further processing for "item" key
      }

      // Ensure the column exists
      if (!response.columns[key]) {
        response.columns[key] = {
          label: key,
          metadata: [],
          cells: {},
        };
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
