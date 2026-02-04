export default {
  private: {
    endpoint: process.env.LLM_ADDRESS,
    processRequest: true,
  },
  public: {
    group: "Gen AI",
    name: "Wikidata LLM Reconciler",
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
        id: "additionalColumns",
        description:
          "Optional columns that provide context to support reconciliation.",
        label: "Select columns",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
