export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Coordinate truncation Modifier",
    description:
      "A transformation function that allows users to reduce the geographic precision of coordinate values " +
      "by truncating decimal places, helping anonymize location data while preserving approximate positioning.<br><br>" +
      "<strong>Common Examples:</strong><br>" +
      "<ul style='list-style-type: disc;'>" +
      "<li><strong>Reduce to ~1km precision:</strong> Input: <code>45.464664</code>, Decimal Places: <code>2</code>, Output: <code>45.46</code></li>" +
      "<li><strong>Reduce to ~111m precision:</strong> Input: <code>45.464664</code>, Decimal Places: <code>3</code>, Output: <code>45.464</code></li>" +
      "<li><strong>Anonymize to city level:</strong> Input: <code>45.464664</code>, Decimal Places: <code>1</code>, Output: <code>45.4</code></li>" +
      "<li><strong>Strip all decimals (country level):</strong> Input: <code>45.464664</code>, Decimal Places: <code>0</code>, Output: <code>45</code></li>" +
      "</ul>" +
      "<strong>Precision Reference:</strong><br>" +
      "<ul style='list-style-type: disc;'>" +
      "<li><code>4</code> decimal places → ~11 meter precision</li>" +
      "<li><code>3</code> decimal places → ~111 meter precision</li>" +
      "<li><code>2</code> decimal places → ~1.1 km precision</li>" +
      "<li><code>1</code> decimal place &nbsp;→ ~11 km precision</li>" +
      "<li><code>0</code> decimal places → ~111 km precision</li>" +
      "</ul>" +
      "<strong>Note:</strong> This technique is a form of <em>geographic masking</em> — lower decimal values mean stronger " +
      "anonymization but less spatial accuracy. Choose the precision level that balances your privacy and analytical needs.<br><br>" +
      "<strong>Input format:</strong> Each row should contain a latitude and longitude separated by a comma (e.g. <code>45.464664,9.188540</code>). Use the <em>Decimal places</em> field below to truncate each coordinate to the desired number of decimal digits.",
    relativeUrl: "",
    skipFiltering: true,
    formParams: [
      {
        id: "outputMode",
        label: "Output mode",
        description:
          "Choose whether to update existing column values or create a new column.",
        inputType: "radio",
        rules: ["required"],
        defaultValue: "update",
        options: [
          { id: "update", label: "Update the current column", value: "update" },
          { id: "create", label: "Create a new column", value: "create" },
        ],
      },
      {
        id: "newColumnName",
        label: "New column name",
        description: "Specify the name for the new column.",
        infoText:
          "Enter a unique name for the new column that will contain the transformation results.",
        inputType: "text",
        placeholder: "e.g., extracted_values",
        rules: ["required"],
        dependsOn: {
          field: "outputMode",
          value: "create",
        },
      },
      {
        id: "decimalPlaces",
        label: "Decimal places",
        description:
          "Number of decimal digits to keep for each coordinate component. Coordinates are truncated (not rounded). Set to 0 to remove decimals.",
        infoText:
          "Enter an integer >= 0. For input rows use a comma-separated 'lat,lon' format.",
        inputType: "text",
        placeholder: "e.g., 3",
        defaultValue: "3",
        rules: ["required"],
        validation: {
          min: 0,
          max: 10,
        },
      },
    ],
  },
};
