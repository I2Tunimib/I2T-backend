export default {
  private: {
    endpoint: process.env.ALLIGATOR,
    access_token: process.env.ALLIGATOR_AUTH_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Linking: Wikidata (Alligator)",
    description:
      "A general purpose reconciliation service using Alligator to match mentions to Wikidata entities. " +
      "It enriches <em> body cells </em> (mentions) with Wikidata IDs, labels, descriptions, and types, and enriches " +
      "<em> header cells </em> (schema) with types and properties.<br><br> " +
      "<strong>Input</strong>: A <em> column of mentions </em> (strings) to reconcile; possibly additional columns " +
      "providing context to improve reconciliation accuracy.<br>" +
      "<strong>Output</strong>: Metadata associated with body and schema cells in W3C compliant format, including " +
      "<em> IDs</em>, <em> labels</em>, <em> descriptions</em>, <em> types</em> and <em> properties</em>.<br><br>" +
      "<strong>Note</strong>: Requires access to the Alligator API. More precise than OpenRefine-based " +
      "reconciliation.",
    relativeUrl: "/dataset",
    prefix: "wd",
    uri: "https://www.wikidata.org/wiki/",
    searchPattern: "https://www.wikidata.org/w/index.php?search={label}",
    searchTypesPattern: "https://www.wikidata.org/w/index.php?search={label}",
    listProps: "https://www.wikidata.org/wiki/Special:ListProperties",
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
      //   {
      //     id: "column2",
      //     description: "Optional column to set the context.",
      //     label: "Select a column to set the context",
      //     infoText: "",
      //     inputType: "selectColumns",
      //     rules: [],
      //   },
      //   {
      //     id: "column3",
      //     description: "Optional column to set the context.",
      //     label: "Select a column to set the context",
      //     infoText: "",
      //     inputType: "selectColumns",
      //     rules: [],
      //   },
      //   {
      //     id: "column4",
      //     description: "Optional column to set the context.",
      //     label: "Select a column to set the context",
      //     infoText: "",
      //     inputType: "selectColumns",
      //     rules: [],
      //   },
    ],
  },
};
