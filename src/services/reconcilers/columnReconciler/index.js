export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Linking: Column Reconciler",
    prefix: "local",
    relativeUrl: "",
    description: "A local reconciliation service that links values from a selected column to matching values " +
      "in another column within the same table. No external APIs are called. <br><br>" +
      "<strong>Input</strong>: A column whose values you want to reconcile, and a reference column containing the" +
      "target values. <br><strong>Output</strong>: Local links between matching cells, enriched with the selected" +
      "URI prefix (e.g., <code>wd:</code>, <code>geo:</code>).",
    uri: "",
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
        description: "Select the prefix to use for generating URIs for matched values (e.g., wd, dbp, geo).",
        infoText: "",
        inputType: "selectPrefix",
        rules: ["required"],
      },
      {
        id: "columnToReconcile",
        label: "Reference column",
        description: "Select the column whose values will be used to reconcile the selected column.",
        infoText: "",
        inputType: "selectColumns",
        rules: ["required"],
      },
    ],
  },
};
