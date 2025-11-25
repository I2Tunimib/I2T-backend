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
      "Open Opportunities company house matching service. It uses a specialized hybrid search service over a collection of european company data. It allows to extend data with the actual company name, address and additional company information. ",
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
