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

  // Construct the full query with required PREFIX declarations
  const sparqlQuery = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX p: <http://www.wikidata.org/prop/>
    PREFIX ps: <http://www.wikidata.org/prop/statement/>
    PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT ${[...uniqueVariables].join(" ")} WHERE {
      VALUES ?item { ${itemsClause} }
      ${sparqlQueryBody}
    }
  `;

  console.log("********** SPARQL QUERY", sparqlQuery);

  try {
    // Send the query to Wikidata
    // Remove '?query=' from endpoint if present since axios params will add it
    const cleanEndpoint = endpoint.replace(/\?query=$/, "");
    const response = await axios.get(cleanEndpoint, {
      params: { query: sparqlQuery, format: "json" },
      headers: { "User-Agent": "Node.js SPARQL Client" },
    });
    console.log("********** SPARQL RESPONSE", response.data);
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
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2),
      );
    }
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

  // Check if items exists and has at least one key
  if (!items || Object.keys(items).length === 0) {
    console.error("Error: No items found in request");
    return [];
  }

  const { variables: variablesString, body } = props;

  // Extract entities (Qxxx) from items.columnName
  const columnName = Object.keys(items)[0]; // Extract the first key (e.g., "Museum")
  console.log("********** Column name:", columnName);

  // Check if the column exists in items
  if (!items[columnName]) {
    console.error(`Error: Column "${columnName}" not found in items`);
    return [];
  }

  const entities = Object.keys(items[columnName]).map(
    (label) => label.split(":")[1],
  );

  // Extract variables from the string and add ?item if it is not included
  const variablesArray = variablesString.split(" ").map((v) => v.trim());
  if (!variablesArray.includes("?item")) {
    variablesArray.push("?item");
  }

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
    return [];
  }
};
