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
      "A reconciliation service using LionLinker for table annotation, linking mentions to Wikidata entities. " +
      "<br><br><strong>Input</strong>: A <em>column of mentions</em> to reconcile; possibly additional columns " +
      "providing context to improve reconciliation accuracy.<br>" +
      "<strong>Output</strong>: Annotations for each matched mention, including <em>ID</em>, <em>name</em>, " +
      "<em>description</em> and <em>types</em>.<br><br>" +
      "<strong>Note</strong>: Requires access to the LionLinker API. More precise than OpenRefine-based " +
      "reconciliation.",
    uri: "https://www.wikidata.org/wiki/",
    searchPattern: "https://www.wikidata.org/w/index.php?search={label}",
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
        label: "Select columns",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
