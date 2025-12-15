export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  skipFiltering: true,
  public: {
    name: "Text to rows",
    relativeUrl: "",
    description:
      "Split a single column into multiple rows by a custom separator, duplicating all other column values.",
    skipFiltering: true,
    formParams: [
      {
        id: "separator",
        label: "Separator",
        description: "Separator used to split values into new rows.",
        inputType: "text",
        rules: ["required"],
      },
    ],
  },
};
