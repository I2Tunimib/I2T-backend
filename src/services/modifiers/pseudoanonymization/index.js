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
        id: "createNewColumn",
        description:
          "Choose whether to replace the current column or create a new one:",
        label: "Column behavior",
        inputType: "checkbox",
        options: [
          {
            id: "createNewColumn",
            label: "Create a new column (default: replace current column)",
            value: "createNewColumn",
          },
        ],
      },
    ],
  },
};
