export default {
  private: {
    endpoint: process.env.PSEUDOANONYMIZATION_ENDPOINT,
    processRequest: false,
  },
  public: {
    name: "Pseudoanonymization",
    relativeUrl: "",
    description:
      "Pseudoanonymize or de-anonymize data in the selected column using encryption service. Choose between encrypting original values or decrypting vault keys.",
    skipFiltering: true,
    formParams: [
      {
        id: "decrypt",
        description: "Select to de-anonymize data (default is to anonymize):",
        label: "De-anonymization",
        inputType: "checkbox",
        options: [
          {
            id: "decrypt",
            label: "De-anonymize (decrypt vault keys to original values)",
            value: "decrypt",
          },
        ],
      },
      {
        id: "outputMode",
        label: "Output mode",
        description:
          "Choose whether to update existing column values or create a new column.",
        inputType: "radio",
        rules: ["required"],
        // default to creating a new column (as requested)
        defaultValue: "create",
        options: [
          { id: "update", label: "Update the current column", value: "update" },
          { id: "create", label: "Create a new column", value: "create" },
        ],
      },
      {
        id: "newColumnName",
        label: "New column name",
        description:
          "<strong>Optional.</strong> Specify the new column name. If left empty, default name will be used (e.g., " +
          "columnName_anonymized).",
        inputType: "text",
        placeholder: "Optional - e.g. address_anonymized",
        dependsOn: {
          field: "outputMode",
          value: "create",
        },
      },
    ],
  },
};
