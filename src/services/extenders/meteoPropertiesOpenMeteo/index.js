export default {
  private: {
    endpoint: process.env.OPEN_METEO_ARCHIVE,
    processRequest: true,
  },
  public: {
    name: "Meteo Properties (OpenMeteo)",
    relativeUrl: "",
    description:
      "An extender that adds weather properties for the geographic points in the selected <em>reconclied " +
      "column</em> (latitude, longitude) for a given date provided in another column.<br><br>" +
      "<strong>Input</strong>: A <em>column reconciled with latitute and longitude</em> (e.g., <code>georss:52.51604," +
      "13.37691</code>); a second <em>column with dates</em> in ISO8601 format (<code>yyyy-MM-dd</code> or " +
      "<code>yyyy-MM-dd'T'HH:mm</code>), plus a <em>selection of weather properties</em>, based on the <em>selected granularity</em>:" +
      '<ul style="list-style-type: disc;">' +
      "<li><em>Daily parameters</em>, returning values aggregated per day:" +
      '<ul style="list-style-type: circle">' +
      "<li>Number of seconds of daylight</li>" +
      "<li>Sun rise and set times UTC in ISO8601</li>" +
      "<li>Maximum daily temperature in °C</li>" +
      "<li>Minimum daily temperature in °C</li>" +
      "<li>Sum of daily precipitation (including rain, showers and snowfall) in mm</li>" +
      "<li>Number of hours with rain</li>" +
      "</ul>" +
      "</li>" +
      "<li><em>Hourly parameters</em>, returning values at a specific hour of a specific day:" +
      '<ul style="list-style-type: circle">' +
      "<li>Temperature at 2 meters above ground in °C</li>" +
      "<li>Relative humidity at 2 meters above ground in %</li>" +
      "<li>Precipitation (rain + snow) in mm</li>" +
      "</ul>" +
      "</li>" +
      "</ul>" +
      "<strong>Output</strong>: A new column for every requested parameter.<br><br>" +
      "<strong>Note</strong>: Only dates prior to 5 days of the current date are covered. All dates in CET timezone. " +
      "If the date column contains full datetime (<code>yyyy-MM-dd'T'HH:mm</code>) and daily parameters are " +
      "selected, the hour information will be ignored.",
    formParams: [
      {
        id: "dates",
        description: "Select a column containing dates:",
        label: "Date column",
        infoText: "Only dates prior to 10 days are covered",
        inputType: "selectColumns",
        rules: ["required"],
      },
      {
        id: "granularity",
        description: "Select the data granularity:",
        label: "Data granularity",
        inputType: "radio",
        rules: ["required"],
        options: [
          {
            id: "daily",
            label: "Daily, returns values aggregated per day",
            value: "daily",
          },
          {
            id: "hourly",
            label:
              "Hourly, returns values at a specific hour of a specific day",
            value: "hourly",
          },
        ],
      },
      {
        id: "weatherParams_daily",
        description: "Select one or more <b> daily weather </b> parameters:",
        label: "Daily weather parameters",
        infoText: "Daily meteo parameters to extend the table",
        inputType: "checkbox",
        rules: ["required"],
        dependsOn: {
          field: "granularity",
          value: "daily",
        },
        options: [
          {
            id: "daylight_duration",
            label: "Number of seconds of daylight",
            value: "daylight_duration",
          },
          {
            id: "light_hours",
            label: "Sun rise and set times UTC in ISO8601",
            value: "light_hours",
          },
          {
            id: "apparent_temperature_max",
            label: "Maximum daily temperature in °C",
            value: "apparent_temperature_max",
          },
          {
            id: "apparent_temperature_min",
            label: "Minimum daily temperature in °C",
            value: "apparent_temperature_min",
          },
          {
            id: "precipitation_sum",
            label:
              "Sum of daily precipitation (including rain, showers and snowfall) in mm",
            value: "precipitation_sum",
          },
          {
            id: "precipitation_hours",
            label: "Number of hours with rain",
            value: "precipitation_hours",
          },
        ],
      },
      {
        id: "weatherParams_hourly",
        description: "Select one or more <b> hourly weather </b> parameters:",
        infoText: "Hourly meteo parameters to extend the table",
        label: "Hourly weather parameters",
        inputType: "checkbox",
        rules: ["required"],
        dependsOn: {
          field: "granularity",
          value: "hourly",
        },
        options: [
          {
            id: "temperature_2m",
            label: "Temperature at 2 meters above ground in °C",
            value: "temperature_2m",
          },
          {
            id: "relative_humidity_2m",
            label: "Relative humidity at 2 meters above ground in %",
            value: "relative_humidity_2m",
          },
          {
            id: "precipitation",
            label: "Precipitation (rain + snow) in mm",
            value: "precipitation",
          },
        ],
      },
      {
        id: "decimalFormat",
        description:
          "<b>Optional. </b>Select to change the default period notation (e.g., 12.3):",
        label: "Decimal format",
        inputType: "checkbox",
        options: [
          {
            id: "format",
            label: "Use comma as decimal separator (e.g., 12,3)",
            value: "comma",
          },
        ],
      },
    ],
  },
};
