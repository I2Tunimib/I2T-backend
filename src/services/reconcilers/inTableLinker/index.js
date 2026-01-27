export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Linking: In-Table Linking",
    prefix: "local",
    relativeUrl: "",
    description: "A local reconciliation service that links values from a selected column to corresponding values" +
      "in another column of the same table, treating the second column as reference metadata for enrichment. <br><br>" +
      "<strong>Input</strong>: A <em>column to reconcile</em>; a <em>reference column</em> containing target values " +
      "to reconcile the selected column; an <em>URI prefix</em> for generating URIs for matched values " +
      "(e.g., <code>wd:</code>, <code>geo:</code>). <br>" +
      "<strong>Output</strong>: Local links between matching cells, enriched with the selected URI prefix. <br><br>" +
      "<strong>Note</strong>: External APIs are called only to retrieve types and descriptions for the linked entities.",
    uri: "",
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
        id: "prefix",
        label: "Prefix",
        description: "Select the URI prefix to use for matched values",
        infoText: "",
        inputType: "selectPrefix",
        rules: ["required"],
      },
      {
        id: "columnToReconcile",
        label: "Reference column",
        description: "Select the reference column containing values to reconcile the selected column",
        infoText: "",
        inputType: "selectColumns",
        rules: ["required"],
      },
    ],
  },
};
