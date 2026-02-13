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
        label: "Column behavior",
        description:
          "Choose whether to replace the current column or create a new one.",
        inputType: "radio",
        rules: ["required"],
        // default to creating a new column (as requested)
        defaultValue: "newColumn",
        options: [
          {
            id: "replace",
            label: "Replace values in current column",
            value: "replace",
          },
          {
            id: "newColumn",
            label: "Create a new column with results",
            value: "newColumn",
          },
        ],
      },
      {
        id: "newColumnName",
        label: "New column name",
        description:
          "If creating a new column, optionally specify the new column name. If left empty, the original column name will be used with '_anonymized' appended.",
        inputType: "text",
        placeholder: "Optional - e.g. address_anonymized",
        dependsOn: {
          field: "outputMode",
          value: "newColumn",
        },
      },
    ],
  },
};
