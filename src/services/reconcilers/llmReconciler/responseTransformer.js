import config from "./index.js";

/**
 * Transforms LLM reconciliation results into the format expected by the frontend.
 *
 * @param {Object} req - The request object
 * @param {Object} res - Response from requestTransformer containing items and llmResponses
 * @returns {Object} - Formatted reconciliation results with metadata
 */
export default async (req, res) => {
  const { items, llmResponses, prefix, uri } = res;

  // Add header as first item (no metadata for header)
  const header = {
    id: items[0].id,
    metadata: [],
  };

  // Process each LLM response
  const response = llmResponses.map((result) => {
    const { id, entityId, name, description, score, match } = result;

    console.log(`\n>>> Processing result for ${id}:`);
    console.log(`    Raw entityId from LLM: "${entityId}"`);
    console.log(`    Name: "${name}"`);
    console.log(`    Prefix to use: "${prefix}"`);

    // Create metadata array for this cell
    const metadata = [];

    // Only add entity if we have a valid entityId
    if (entityId && name) {
      // Ensure the entityId has the prefix
      let formattedId = entityId;
      if (!formattedId.includes(":")) {
        // If no prefix, add it (assume it's a Wikidata Q ID)
        const cleanId = formattedId.replace(/^Q?/, "Q"); // Ensure it starts with Q
        formattedId = `${prefix}:${cleanId}`;
        console.log(`    No prefix found, added prefix: "${formattedId}"`);
      } else {
        console.log(`    Prefix already exists: "${formattedId}"`);
      }

      console.log(`    Final formatted ID: "${formattedId}"`);

      // Extract entity ID without prefix for URI construction
      const entityIdWithoutPrefix = formattedId.split(":")[1] || formattedId;
      const entityUri = `${uri}${entityIdWithoutPrefix}`;

      console.log(`    Entity URI being set: "${entityUri}"`);
      console.log(`    Name being set: "${name}"`);

      metadata.push({
        id: formattedId,
        name: name,
        uri: entityUri,
        description: description || "",
        score: score || 0,
        match: match || false,
        type: [], // LLM can be extended to return types if needed
      });

      console.log(
        `    Metadata entry:`,
        JSON.stringify(metadata[metadata.length - 1], null, 2),
      );
    } else {
      console.log(`    Skipping - entityId or name is missing`);
    }

    // Return the cell annotation
    return {
      id: id,
      metadata: metadata,
    };
  });

  // Add header to the beginning
  response.unshift(header);

  // Check if any reconciliation results were found
  const hasResults = response.some((item) => {
    return (
      item.metadata &&
      item.metadata.length > 0 &&
      item.metadata.some((meta) => meta.match)
    );
  });

  // If no matches found, set error
  let error = null;
  if (!hasResults) {
    error = req.config.errors.reconciler["02"];
  }

  console.log(
    `Reconciliation complete: ${response.length - 1} items processed, ${hasResults ? "matches found" : "no matches found"}`,
  );

  const finalResponse = { ...response, error };
  console.log("\n*** Final response structure being returned:");
  console.log(JSON.stringify(finalResponse, null, 2));

  return finalResponse;
};
