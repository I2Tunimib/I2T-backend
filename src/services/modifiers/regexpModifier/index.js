export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Regular Expression Modifier",
    description:
      "A transformation function that allows users to apply regular expression operations on text data, " +
      "including pattern matching, replacement, and extraction of matched values.<br><br>" +
      "<strong>Common Examples:</strong><br>" +
      "<ul style='list-style-type: disc;'>" +
      "<li><strong>Extract numbers with up to 2 decimals:</strong> Pattern: <code>\\d+\\.\\d{1,2}</code> (without anchors)</li>" +
      "<li><strong>Truncate to 2 decimals:</strong> Operation: Replace, Pattern: <code>^(\\d+\\.\\d{2})\\d*$</code>, Replacement: <code>$1</code></li>" +
      "<li><strong>Extract email addresses:</strong> Pattern: <code>\\w+@\\w+\\.\\w+</code></li>" +
      "<li><strong>Remove special characters:</strong> Operation: Replace, Pattern: <code>[^a-zA-Z0-9\\s]</code>, Replacement: (empty)</li>" +
      "</ul>" +
      "<strong>Note:</strong> Use anchors (^ and $) only when you want to match the ENTIRE cell value. " +
      "Without anchors, the pattern will match anywhere within the text.",
    relativeUrl: "",
    skipFiltering: true,
    formParams: [
      {
        id: "operationType",
        label: "Operation type",
        description:
          "Select the type of regular expression operation to perform.",
        inputType: "radio",
        rules: ["required"],
        options: [
          { id: "replace", label: "Match and replace", value: "replace" },
          {
            id: "extractAll",
            label: "Extract all matches",
            value: "extractAll",
          },
          {
            id: "extractFirst",
            label: "Extract first match",
            value: "extractFirst",
          },
          { id: "extractNth", label: "Extract nth match", value: "extractNth" },
          {
            id: "extractUpToN",
            label: "Extract up to N matches",
            value: "extractUpToN",
          },
          {
            id: "test",
            label: "Test pattern (returns true/false)",
            value: "test",
          },
          { id: "count", label: "Count matches", value: "count" },
        ],
      },
      {
        id: "pattern",
        label: "Regular expression pattern",
        description: "Enter the regular expression pattern to match.",
        infoText:
          "Use standard JavaScript regular expression syntax. Example: \\d+ matches one or more digits. " +
          "Common patterns: \\d (digit), \\w (word char), \\s (whitespace), . (any char), + (one or more), * (zero or more), {n,m} (between n and m). " +
          "Use ^ for start and $ for end if you need to match the entire cell value.",
        inputType: "text",
        placeholder: "e.g., \\d+\\.\\d{1,2}",
        rules: ["required"],
      },
      {
        id: "flags",
        label: "Regular expression flags",
        description: "Specify flags to modify the pattern matching behavior.",
        infoText:
          "Common flags: g (global), i (case-insensitive), m (multiline), s (dotAll), u (unicode), y (sticky)",
        inputType: "text",
        placeholder: "e.g., gi",
        defaultValue: "g",
        rules: [],
      },
      {
        id: "replacement",
        label: "Replacement string",
        description:
          "Enter the replacement string (for replace operation only).",
        infoText:
          "You can use $1, $2, etc. to reference capture groups, or $& for the entire match.",
        inputType: "text",
        placeholder: "e.g., Replacement text or $1",
        rules: [],
        dependsOn: {
          field: "operationType",
          value: "replace",
        },
      },
      {
        id: "matchIndex",
        label: "Match index",
        description:
          "Specify which match to extract (0-based index, for extractNth operation only).",
        infoText: "0 = first match, 1 = second match, etc.",
        inputType: "text",
        placeholder: "e.g., 0",
        rules: [],
        dependsOn: {
          field: "operationType",
          value: "extractNth",
        },
      },
      {
        id: "matchCount",
        label: "Match count",
        description:
          "Specify how many matches to extract (for extractUpToN operation only).",
        infoText: "Maximum number of matches to extract from the beginning.",
        inputType: "text",
        placeholder: "e.g., 3",
        rules: [],
        dependsOn: {
          field: "operationType",
          value: "extractUpToN",
        },
      },
      {
        id: "outputMode",
        label: "Output mode",
        description:
          "Choose whether to replace the existing column or create a new one.",
        inputType: "radio",
        rules: ["required"],
        options: [
          {
            id: "replace",
            label: "Replace values in current column",
            value: "replace",
          },
          {
            id: "newColumn",
            label: "Create new column with results",
            value: "newColumn",
          },
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
          value: "newColumn",
        },
      },
    ],
  },
};
