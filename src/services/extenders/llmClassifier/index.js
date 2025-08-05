export default {
  private: {
    endpoint: process.env.LLM_ADDRESS,
    processRequest: true,
  },
  public: {
    name: "LLM Classifier",
    relativeUrl: "",
    description:
      "Classifies a government department or public organization into a single, top-level COFOG (Classification of the Functions of Government) category based on provided information. " +
      "Uses organization name, description, country, and Wikidata details to determine the most appropriate category among ten COFOG options. " +
      "Returns a JSON object with the selected category, confidence level, and reasoning for the classification. " +
      "<br><strong>Input</strong>: Organization details including name, description, country, Wikidata description, and type." +
      "<br><strong>Output</strong>: JSON with fields: cofog_label (01-10), confidence (high/medium/low), and reasoning.",
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
