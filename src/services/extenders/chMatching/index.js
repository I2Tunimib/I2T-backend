export default {
  private: {
    endpoint: process.env.CH_MATCHING_ENDPOINT,
    processRequest: true,
  },
  public: {
    group: "Gen AI",
    relativeUrl: "",
    allValues: true,
    skipFiltering: true,
    name: "CH Matching - Private",
    description:
      "An LLM-based Open Opportunities company house matching service. It uses a specialized hybrid search over a collection of European company data plus an LLM to reason about ambiguous or partial matches.<br><br>" +
      "<strong>Input</strong>: A column containing company name values (can be reconciled names or raw text).<br>" +
      "<strong>Output</strong>: New columns such as:" +
      "<ul style='list-style-type: disc;'>" +
      "<li><code>company_official_name</code></li>" +
      "<li><code>company_number</code></li>" +
      "<li><code>company_address</code></li>" +
      "<li>Additional columns with LLM-based reasoning explanations (e.g., <code>llm_match_reason</code>, <code>llm_confidence</code>) that describe why a match was selected and any normalization or assumptions applied</li>" +
      "</ul>",
    formParams: [
      {
        id: "additionalColumns",
        description:
          "Optional columns that provide address or contextual fields to improve matching (e.g. line_1, line_2, postcode).",
        label: "Select address/context columns",
        infoText: "Providing address components can improve match quality.",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
