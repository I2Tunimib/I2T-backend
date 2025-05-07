import { match } from "assert";
import fs from "fs";

export default async (req, res) => {
  try {
    // Read the JSON file with property descriptions
    const data = await fs.promises.readFile("./wikidataPropsObj.json", "utf8");
    const wikiProps = JSON.parse(data);
    const { items, props } = req.original;

    let response = {
      columns: {},
      meta: {},
      originalColMeta: {},
    };
    console.log("********** original:", req.original);
    // Extract row mapping from columnName
    const columnName = Object.keys(items)[0]; // Extract the first key (e.g., "Museum")
    console.log("********** response Column name:", columnName);

    const rowMapping = {};
    Object.entries(items[columnName]).forEach(([rowKey, itemValue]) => {
      // Extract the Qxxx part from the "wd:Qxxx" format
      const itemId = itemValue.split(":")[1];
      rowMapping[itemId] = rowKey;
    });
    let newProperties = [];
    let addedProps = [];
    // Iterate over the properties to create new properties

    // Iterate over the array `res` to populate columns
    res.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key === "item") {
          // Map item to its row (skip column creation for "item")
          const itemId = value.split("/").pop(); // Extract Qxxx from the URL
          const rowKey = rowMapping[itemId];
          if (!rowKey) {
            console.warn(
              `********** response Item ${itemId} not found in row mapping.`
            );
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
            console.log(
              `********** response Key ${key} not found in wikiProps.`
            );
          }
          if (!newProperties.some((prop) => prop.id === `wd:${key}`)) {
            newProperties.push({
              id: `wd:${key}`,
              obj: newColName,
              name: `${wikiProps[key].label}`,
              match: true,
              score: 1,
            });
            addedProps.push(`wd:${key}`);
          }

          // Ensure the column exists
          if (!response.columns[newColName]) {
            const propertyId = key;
            response.columns[newColName] = {
              label: newColName,
              metadata: [
                {
                  id: `wd:${propertyId}`,
                  name: wikiProps[key]?.label || propertyId,
                  description: wikiProps[key]?.description || "",
                  match: true,
                  score: 100,
                  features: [
                    {
                      id: "all_labels",
                      value: 100,
                    },
                  ],
                  type: [],
                },
              ],
              cells: {},
            };
          }

          // Populate the cell for the current row and column
          let label;
          if (value.startsWith("http://www.wikidata.org/entity/")) {
            label = `${entry[`${key}Label`]}`;
          } else {
            label = value;
          }
          const itemId = entry.item.split("/").pop(); // Extract Qxxx from the URL
          const rowKey = rowMapping[itemId];
          console.log(
            `********** response rowKey: ${rowKey} - columnName: ${columnName} - newColName: ${newColName} - itemId: ${itemId} - label: ${label}`
          );
          console.log(
            `********** response newColName: ${newColName} - value: ${value}`
          );

          if (rowKey) {
            response.columns[newColName].cells[rowKey] = {
              label: label,
              metadata: [
                {
                  id: value.startsWith("http://www.wikidata.org/entity/")
                    ? `wd:${value.split("/").pop()}`
                    : value,
                  name: entry[`${key}Label`] || label,
                  description: "",
                  match: true,
                  score: 100,
                  features: [
                    {
                      id: "all_labels",
                      value: 100,
                    },
                  ],
                  type: [],
                },
              ],
            };
          }
        }
      });
    });
    console.log(
      `********** response newProperties: ${JSON.stringify(newProperties)}`
    );
    response.originalColMeta = {
      originalColName: columnName,
      properties: newProperties,
    };
    return response;
  } catch (error) {
    console.error("Error processing the request:", error);
    res.status(500).send("Internal Server Error");
  }
};
