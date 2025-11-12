export default {
  private: {
    endpoint: process.env.LION_LINKER_API_URL || "http://localhost:9000",
    apiKey: process.env.OPENAI_API_KEY,
    processRequest: true,
  },
  public: {
    allValues: true,
    name: "Linking: Wikidata (LionLinker)",
    prefix: "wdL",
    relativeUrl: "/lionlinker",
    description:
      "Reconciliation service using LionLinker for table annotation. Annotates mentions to Wikidata entities, with optional context columns for improved accuracy.",
    uri: "https://www.wikidata.org/wiki/",
    metaToView: {
      id: {
        label: "ID",
      },
      name: {
        label: "Name",
        type: "link",
      },
      score: {
        label: "Score",
      },
      type: {
        label: "Types",
        type: "subList",
      },
      description: {
        label: "Description",
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
        label: "Select columns from the list, then click outside to confirm.",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
