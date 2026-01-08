export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Text to rows",
    relativeUrl: "",
    description:
      "A transformation function that allows splitting the values of a single column into multiple rows " +
      "using a custom separator defined by the user. For each split value, a new row is created and the " +
      "values of the other columns are duplicated.",
    skipFiltering: true,
    formParams: [
      {
        id: "separator",
        label: "Separator",
        description: "Specify the separator to use for splitting values into new rows.",
        infoText: "",
        inputType: "text",
        rules: ["required"],
      },
    ],
  },
};
