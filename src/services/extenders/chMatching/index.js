export default {
  private: {
    endpoint: process.env.CH_MATCHING_ENDPOINT,
    processRequest: true,
  },
  public: {
    relativeUrl: "",
    allValues: true,
    name: "CH Matching",
    description:
      "Match company names to Companies House data using optional address context for better matching. Adds new columns with matched company details.",
    formParams: [
      {
        id: "additionalColumns",
        description:
          "Optional columns that provide address context (select in order: line_1, line_2, postcode).",
        label: "Select address columns",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
