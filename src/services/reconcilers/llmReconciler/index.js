export default {
  private: {
    endpoint: process.env.LLM_ADDRESS,
    processRequest: true,
  },
  public: {
    group: "Gen AI",
    name: "LLM Reconciler",
    description:
      "A flexible LLM-powered reconciliation service that matches text values to entities based on custom instructions. " +
      "Use the LLM to intelligently reconcile data to knowledge base entities (like Wikidata) with custom matching logic.<br><br>" +
      "<strong>Input</strong>: Column values to reconcile and custom instructions for matching.<br>" +
      "<strong>Output</strong>: Entity matches with IDs, labels, descriptions, types, and confidence scores.<br><br>" +
      "<strong>How to use:</strong><br>" +
      "Write instructions describing how to match the values. The LLM will receive each cell value and return entity information.<br><br>" +
      "<strong>Example:</strong><br>" +
      "Prompt: <code>Match this location to a Wikidata entity. Return the entity ID, name, description, and confidence score (0-100).</code>",
    relativeUrl: "",
    metaToView: {
      id: {
        label: "ID",
      },
      name: {
        label: "Name",
        type: "link",
      },
      description: {
        label: "Description",
      },
      score: {
        label: "Score",
      },
      match: {
        label: "Match",
        type: "tag",
      },
    },
    formParams: [
      {
        id: "prefix",
        description:
          "Enter the prefix for entity IDs (e.g., 'wd' for Wikidata, 'geo' for Geonames):",
        label: "Entity prefix",
        inputType: "text",
        defaultValue: "wd",
        rules: ["required"],
      },
      {
        id: "uri",
        description:
          "Enter the base URI for entities (e.g., 'https://www.wikidata.org/' for Wikidata):",
        label: "Base URI",
        inputType: "text",
        defaultValue: "https://www.wikidata.org/wiki/",
        rules: ["required"],
      },
      {
        id: "prompt",
        description:
          "Write instructions for how to reconcile/match the cell values to entities. The LLM will receive each cell value and must return: entityId (string with prefix like 'wd:Q123'), name (string), description (string), score (0-100), and match (true/false):",
        label: "Reconciliation instructions",
        inputType: "textArea",
        rules: ["required"],
      },
    ],
  },
};
