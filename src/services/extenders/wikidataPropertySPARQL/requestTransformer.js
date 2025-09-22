import config from "./index.js";
import axios from "axios";
import { stringify } from "qs";
import fs from "fs";

const { endpoint } = config.private;

/**
 * Executes a SPARQL query on Wikidata and returns the results as a table.
 * @param {Array<string>} items - List of items to associate with ?item (e.g., ["Q46588", "Q3306248"]).
 * @param {Array<string>} variables - Variables to include in the SELECT clause (e.g., ["?elevation", "?unit", "?latitude"]).
 * @param {string} sparqlQueryBody - Body of the SPARQL query (after WHERE).
 * @returns {Promise<Array<Object>>} - Results of the query as an array of objects.
 */
async function queryWikidata(items, variables, sparqlQueryBody) {
  // Ensure ?item is always included among the variables
  const uniqueVariables = new Set(variables);
  uniqueVariables.add("?item"); // Adds ?item if it is not already included

  // Construct the VALUES clause
  const itemsClause = items.map((item) => `wd:${item}`).join(" ");

  // Construct the full query
  const sparqlQuery = `
    SELECT ${[...uniqueVariables].join(" ")} WHERE {
      VALUES ?item { ${itemsClause} }
      ${sparqlQueryBody}
    }
  `;

  console.log("********** SPARQL QUERY", sparqlQuery);
  const encodedQuery = encodeURIComponent(sparqlQuery);
  const url = `${endpoint}${encodedQuery}&format=json`;

  try {
    // Send the query to Wikidata
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Node.js SPARQL Client",
        Accept: "application/sparql-results+json",
      },
    });

    // Extract the results
    const bindings = response.data.results.bindings;

    // Convert to table format
    const results = bindings.map((row) => {
      const parsedRow = {};
      for (const [key, value] of Object.entries(row)) {
        parsedRow[key] = value.value; // Extracts the value from the SPARQL structure
      }
      return parsedRow;
    });

    return results;
  } catch (error) {
    console.error("Error during SPARQL query:", error.message);
    throw error;
  }
}

/**
 * Main function to process the request and return the results.
 * @param {Object} req - The request object containing 'processed' data.
 * @returns {Promise<Array<Object>>} - Results of the SPARQL query as an array of objects.
 */
export default async (req) => {
  // Save the request to a file (optional)
  // fs.writeFile('../../fileSemTUI/requestEXT-UI-SPARQL.json', JSON.stringify(req), function (err) {
  //   if (err) throw err;
  //   console.log('********** File ../../fileSemTUI/requestEXT-UI-SPARQL.json saved!');
  // });

  const { items, props } = req.processed;
  // const { variables: variablesString, body } = props;
  const { properties } = props;

  // Extract entities (Qxxx) from items.columnName
  const columnName = Object.keys(items)[0]; // Extract the column name (e.g., "Museum")
  console.log("********** Column name:", columnName);
  console.log("********** Properties:", properties);
  const entities = Object.keys(items[columnName]).map(
    (label) => label.split(":")[1]
  );

  // Extract variables from the string and add ?item if it is not included
  // Split by one or more spaces, trim each element, and then prefix with '?'
  let variablesArray;
  if (Array.isArray(properties)) {
    // Handle array case like ["P8687", "P34", "P221"]
    variablesArray = properties.flatMap((prop) => [
      `?${prop}`,
      `?${prop}Label`,
    ]);
  } else {
    // Handle string case with space-separated properties
    variablesArray = properties
      .trim() // Remove leading and trailing spaces
      .split(/\s+/) // Split by one or more spaces
      .filter((v) => v.trim() !== "") // Remove any empty strings
      .flatMap((v) => [`?${v.trim()}`, `?${v.trim()}Label`]); // Generate both `?v` and `?vLabel`
  }

  if (!variablesArray.includes("?item")) {
    variablesArray.push("?item");
  }

  // Transform the properties string into the WHERE part of a SPARQL query, removing extra spaces
  let body;
  if (Array.isArray(properties)) {
    // Handle array case like ["P451", "P34", "P221"]
    body = properties.map((prop) => `?item wdt:${prop} ?${prop}.`).join(" ");
  } else {
    // Handle string case with space-separated properties
    body = properties
      .trim() // Remove leading and trailing spaces
      .split(/\s+/) // Split on one or more spaces
      .map((prop) => `?item wdt:${prop} ?${prop}.`) // Create the SPARQL triples
      .join(" "); // Join them back with a single space
  }
  body += `
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".  # Set language preference
  }`;

  // Log entities, variables, and query body for debugging
  console.log("********** Entities:", entities);
  console.log("********** Variables Array:", variablesArray);
  console.log("********** SPARQL Query Body:", body);

  try {
    // Execute the SPARQL query using the extracted data
    const results = await queryWikidata(entities, variablesArray, body);
    // Save the response to a file (optional)
    // fs.writeFile('../../fileSemTUI/response-SPARQL.json', JSON.stringify(results), function (err) {
    //   if (err) throw err;
    //   console.log('********** File ../../fileSemTUI/response-SPARQL.json saved!');
    // });

    // Return the obtained results
    return results;
  } catch (error) {
    console.error("Error:", error.message);
    // throw error;
  }
};
