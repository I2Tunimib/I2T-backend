export default {
  private: {
    endpoint: process.env.LLM_ADDRESS,
    processRequest: true,
  },
  public: {
    name: "COFOG Classifier",
    relativeUrl: "",
    description: "A classification service that assigns a government department or public organization to the most " +
      "appropriate category among the ten top-level COFOG (Classification of the Functions of Government) options. " +
      "The classification is based on the organization's name, description, country, and Wikidata metadata.<br><br>" +
      "<strong>Input</strong>: Organization details including <em>name</em>, <em>description</em>, <em>country</em> " +
      "and optional <em>Wikidata fields</em> such as description or type.<br>" +
      "<strong>Output</strong>: A JSON object containing the predicted COFOG category (<code>cofog_label: 01-10</code>), " +
      "confidence level (high/medium/low) and reasoning notes.",
    formParams: [
      {
        id: "description",
        description:
          "Select the column containing the organization description:",
        label: "Description column",
        inputType: "selectColumns",
      },
      {
        id: "country",
        description: "Select the column containing the country name:",
        label: "Country column",
        inputType: "selectColumns",
      },
    ],
  },
};
