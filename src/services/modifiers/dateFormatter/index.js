export default {
  private: {
    endpoint: "",
    processRequest: true,
  },
  public: {
    name: "Date Formatter",
    relativeUrl: "",
    description:
      "A transformation function that converts date-like values in the selected column(s) into a standardized or" +
      " custom date format, using date-fns library for date parsing and formatting.",
    skipFiltering: true,
    formParams: [
      {
        id: "formatType",
        label: "Output format type",
        description: "Select a predefined format or choose 'Custom' to specify your own.",
        inputType: "radio",
        rules: ["required"],
        options: [
          { id: "iso", label: "ISO 8601 (yyyy-MM-dd)", value: "iso" },
          { id: "european", label: "European (dd/MM/yyyy)", value: "european" },
          { id: "us", label: "US (MM/dd/yyyy)", value: "us" },
          { id: "custom", label: "Custom date pattern", value: "custom" },
        ],
      },
      {
        id: "customPattern",
        label: "Custom date pattern",
        description: "Specify a custom pattern (e.g. yyyy-MM-dd HH:mm:ss)",
        inputType: "text",
        placeholder: "Use 'MMMM' pattern to display the month as text (e.g., January)",
        conditional: { field: "formatType", value: "custom" },
        rules: ["required"],
      },
      {
        id: "detailLevel",
        label: "Detail level",
        description: "Define the level of detail to include in the formatted output.",
        inputType: "select",
        options: [
          { id: "day", label: "Day (dd)", value: "day" },
          { id: "monthNumber", label: "Month Number (MM)", value: "monthNumber" },
          { id: "monthText", label: "Month Text (MMMM)", value: "monthText" },
          { id: "year", label: "Year (yyyy)", value: "year" },
          { id: "monthYear", label: "Month and year (MM-yyyy)", value: "monthYear" },
          { id: "date", label: "Date only", value: "date" },
          { id: "hour", label: "Include hours (HH)", value: "hour" },
          { id: "minutes", label: "Include hours and minutes (HH:mm)", value: "minutes" },
          { id: "seconds", label: "Include hours, minutes and seconds (HH:mm:ss)", value: "seconds" },
          { id: "milliseconds", label: "Include milliseconds (HH:mm:ss.SSS)", value: "milliseconds" },
          { id: "timezone", label: "Include timezone (HH:mm:ss:SSS XXX)", value: "timezone" },
        ],
        defaultValue: "date",
      },
      {
        id: "outputMode",
        label: "Output mode",
        description: "Choose whether to create a new column or overwrite existing values.",
        inputType: "radio",
        defaultValue: "create",
        options: [
          { id: "create", label: "Create new column", value: "create" },
          { id: "edit", label: "Edit existing column values", value: "edit" },
        ],
      },
    ],
  },
};
