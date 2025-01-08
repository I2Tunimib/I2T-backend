import fs from 'fs';

export default async (req, res) => {
  try {
    // Read the JSON file with property descriptions
    const data = await fs.promises.readFile('./wikidataPropsObj.json', 'utf8');
    const wikiProps = JSON.parse(data);
    const {items} = req.original;

    let response = {
      columns: {},
      meta: {}
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

    // Iterate over the array `res` to populate columns
    res.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key === "item") {
          // Map item to its row (skip column creation for "item")
          const itemId = value.split("/").pop(); // Extract Qxxx from the URL
          const rowKey = rowMapping[itemId];
          if (!rowKey) {
            console.warn(`********** response Item ${itemId} not found in row mapping.`);
          }
          return; // Skip further processing for "item" key
        }

        if (!key.endsWith("Label")) {
          // Find the column label for the property
          let newColName;
          if (wikiProps[key]) {
            newColName = `${wikiProps[key].label} (${key})`; // Create the new column name
            // console.log(newColName);
          } else {
            newColName = key; // Keep property id as column name
            console.log(`********** response Key ${key} not found in wikiProps.`);
          }

          // Ensure the column exists
          if (!response.columns[newColName]) {
            response.columns[newColName] = {
              label: newColName,
              metadata: [],
              cells: {}
            };
          }

          // Populate the cell for the current row and column
          let label;
            if (value.startsWith("http://www.wikidata.org/entity/")) {
              label = `${entry[`${key}Label`]} (wd:${value.split("/").pop()})`;
            } else {
              label = value;
            }
          const itemId = entry.item.split("/").pop(); // Extract Qxxx from the URL
          const rowKey = rowMapping[itemId];
          if (rowKey) {
            response.columns[newColName].cells[rowKey] = {
              label: label,
              metadata: []
            };
          }
        }
      });
    });

    return response;

  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).send('Internal Server Error');
  }
};
