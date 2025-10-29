export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Data Cleaning",
    description: "A transformation function that allows users to clean and normalize textual data by applying basic" +
      "text operations such as trimming whitespace, changing case (lowercase, uppercase, titlecase).",
    relativeUrl: "",
    skipFiltering: true,
    formParams: [
      {
        id: "operationType",
        label: "Transform operation",
        description: "Select a transformation operation to apply to the selected column.",
        inputType: "radio",
        infoText: "",
        rules: ["required"],
        options: [
          { id: "trim", label: "Remove unnecessary whitespace", value: "trim" },
          { id: "removeSpecial", label: "Remove special characters", value: "removeSpecial" },
          { id: "normalizeAccents", label: "Normalize accents and diacritics", value: "normalizeAccents" },
          { id: "toLowercase", label: "Convert to lowercase", value: "toLowercase" },
          { id: "toUppercase", label: "Convert to uppercase", value: "toUppercase" },
          { id: "toTitlecase", label: "Convert to titlecase", value: "toTitlecase" },
        ],
      },
    ],
  },
};
