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
          { id: "iso", label: "ISO 8601 (yyyy-MM-dd'T'HH:mm:ssXXX)", value: "iso" },
          { id: "european", label: "European (dd/MM/yyyy HH:mm:ssXXX)", value: "european" },
          { id: "us", label: "US (MM/dd/yyyy HH:mm:ssXXX)", value: "us" },
          { id: "custom", label: "Custom date pattern", value: "custom" },
        ],
      },
      {
        id: "customPattern",
        label: "Custom date pattern",
        description: "Specify a custom pattern (e.g. yyyy-MM-dd HH:mm:ss.SSS)",
        infoText: "Allowed tokens: yyyy (year), MM (month number), MMMM (month text), dd (day), HH (hour 24h), " +
          "hh (hour 12h), a (AM/PM), mm (minutes), ss (seconds), SSS (milliseconds), " +
          "XXX (timezone offset [e.g., +02:00]), z (timezone abbreviation [e.g., GMT+2])",
        inputType: "text",
        placeholder: "Check (?) to view allowed tokens",
        rules: ["required"],
      },
      {
        id: "columnToJoin",
        label: "Column to join",
        description: "Select column to join",
        infoText: "",
        inputType: "selectColumns",
        rules: [],
      },
      {
        id: "detailLevel",
        label: "Detail level",
        description: "Define the level of detail to include in the formatted output. Available options are " +
          "determined by the selected format type.",
        inputType: "select",
        rules: ["required"],
        options: [
          { id: "year", label: "Year only (yyyy)", value: "year" },
          { id: "monthYear", label: "Month-Year only (MM-yyyy)", value: "monthYear" },
          { id: "monthNumber", label: "Month number only (MM)", value: "monthNumber" },
          { id: "monthText", label: "Month text only (MMMM)", value: "monthText" },
          { id: "day", label: "Day only (dd)", value: "day" },
          { id: "dateOnly", label: "Date only", value: "dateOnly" },
          { id: "hour", label: "Hour only (HH)", value: "hour" },
          { id: "hour12", label: "Hour 12h only (hh a)", value: "hour12" },
          { id: "minutes", label: "Minutes only (mm)", value: "minutes" },
          { id: "seconds", label: "Seconds only (ss)", value: "seconds" },
          { id: "milliseconds", label: "Milliseconds only (SSS)", value: "milliseconds" },
          { id: "hourMinutes", label: "Hour and minutes (HH:mm)", value: "hourMinutes" },
          { id: "hourMinutes12", label: "Hour and minutes 12h (hh:mm a)", value: "hourMinutes12" },
          { id: "hourSeconds", label: "Hour with seconds (HH:mm:ss)", value: "hourSeconds" },
          { id: "hourSecondsUTC", label: "Hour with seconds UTC (HH:mm:ss'Z')", value: "hourSecondsUTC" },
          { id: "hourSeconds12", label: "Hour with seconds 12h (hh:mm:ss a)", value: "hourSeconds12" },
          { id: "hourMilliseconds", label: "Hour with milliseconds (HH:mm:ss.SSS)", value: "hourMilliseconds" },
          { id: "timezone", label: "Hour with timezone and offset (HH:mm:ssXXX) [e.g., +02:00]", value: "timezone" },
          { id: "timezoneAbbr", label: "Hour with timezone GMT (HH:mm:ss z) [e.g., GMT+2]", value: "timezoneAbbr" },
        ],
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
