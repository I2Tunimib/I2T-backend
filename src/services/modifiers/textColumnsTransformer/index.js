export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Text to columns / Columns to text",
    relativeUrl: "",
      description:
        "A transformation function that allows joining multiple columns into one or splitting a single column into" +
        " multiple columns, based on a custom separator defined by the user.",
      skipFiltering: true,
      formParams: [
        {
          id: "operationType",
          label: "Operation type",
          description: "Select whether to join or split columns.",
          inputType: "radio",
          rules: ["required"],
          options: [
            { id: "joinOp", label: "Join columns", value: "joinOp" },
            { id: "splitOp", label: "Split column", value: "splitOp" },
          ],
        },
        {
          id: "columnToJoinSplit",
          label: "Additional columns to join",
          description: "<strong>Optional:</strong> Specify one or more additional columns to include in the join operation, " +
            "in addition to the columns already selected in the main interface.",
          infoText: "",
          inputType: "multipleColumnSelect",
        },
        {
          id: "separator",
          label: "Separator",
          description: "Specify the separator to use for joining or splitting values.",
          infoText: "",
          inputType: "text",
          rules: ["required"],
        },
        {
          id: "renameNewColumn",
          label: "Custom column name",
          description: "<strong>Optional:</strong> Specify a custom name for the resulting joined column. " +
            "If left blank, a default name in the format 'col1_col2' will be applied.",
          infoText: "",
          inputType: "text",
        },
      ],
  },
};
