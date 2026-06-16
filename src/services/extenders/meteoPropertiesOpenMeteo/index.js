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
      "<code>yyyy-MM-dd'T'HH:mm</code>), plus a <em>selection of weather properties</em>, based on the <em>selected granularity</em>.<br><br>" +
      "<em>Daily parameters</em>, returning values aggregated per day:" +
      '<ul style="list-style-type: disc;">' +
      "<li>Number of seconds of daylight [<a href='https://www.wikidata.org/wiki/Property:P2047' target='_blank' rel='noopener noreferrer'>P2047</a>]</li>" +
      "<li>Sun rise and set times UTC in ISO8601 [<a href='https://www.wikidata.org/wiki/Property:P2047' target='_blank' rel='noopener noreferrer'>P2047</a>]</li>" +
      "<li>Maximum daily temperature in °C [<a href='https://www.wikidata.org/wiki/Property:P6591' target='_blank' rel='noopener noreferrer'>P6591</a>]</li>" +
      "<li>Minimum daily temperature in °C [<a href='https://www.wikidata.org/wiki/Property:P7422' target='_blank' rel='noopener noreferrer'>P7422</a>]</li>" +
      "<li>Sum of daily precipitation (including rain, showers and snowfall) in mm [<a href='https://www.wikidata.org/wiki/Property:P3036' target='_blank' rel='noopener noreferrer'>P3036</a>]</li>" +
      "<li>Number of hours with rain [<a href='https://www.wikidata.org/wiki/Property:P2047' target='_blank' rel='noopener noreferrer'>P2047</a>]</li>" +
      "</ul>" +
      "<em>Hourly parameters</em>, returning values at a specific hour of a specific day:" +
      '<ul style="list-style-type: disc;">' +
      "<li>Temperature at 2 meters above ground in °C [<a href='https://www.wikidata.org/wiki/Property:P2076' target='_blank' rel='noopener noreferrer'>P2076</a>]</li>" +
      "<li>Relative humidity at 2 meters above ground in % [<a href='https://www.wikidata.org/wiki/Property:P5596' target='_blank' rel='noopener noreferrer'>P5596</a>]</li>" +
      "<li>Precipitation (rain + snow) in mm [<a href='https://www.wikidata.org/wiki/Property:P3036' target='_blank' rel='noopener noreferrer'>P3036</a>]</li>" +
      "</ul>" +
      "<strong>Output</strong>: A new column for every requested parameter.<br><br>" +
      "<strong>Note</strong>: Only dates prior to 5 days of the current date are covered. All dates in CET timezone. " +
      "If the date column contains full datetime (<code>yyyy-MM-dd'T'HH:mm</code>) and daily parameters are " +
      "selected, the hour information will be ignored.",
    formParams: [
      {
        id: "dates",
        description: "Select a column containing dates [<a href='https://www.wikidata.org/wiki/Property:P585' target='_blank' rel='noopener noreferrer'>P585</a>]:",
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
        inputType: "checkbox",
        rules: ["required"],
        dependsOn: {
          field: "granularity",
          value: "daily",
        },
        options: [
          {
            id: "daylight_duration",
            label: "Number of seconds of daylight [P2047]",
            value: "daylight_duration",
          },
          {
            id: "light_hours",
            label: "Sun rise and set times UTC in ISO8601 [P2047]",
            value: "light_hours",
          },
          {
            id: "apparent_temperature_max",
            label: "Maximum daily temperature in °C [P6591]",
            value: "apparent_temperature_max",
          },
          {
            id: "apparent_temperature_min",
            label: "Minimum daily temperature in °C [P7422]",
            value: "apparent_temperature_min",
          },
          {
            id: "precipitation_sum",
            label:
              "Sum of daily precipitation (including rain, showers and snowfall) in mm [P3036]",
            value: "precipitation_sum",
          },
          {
            id: "precipitation_hours",
            label: "Number of hours with rain [P2047]",
            value: "precipitation_hours",
          },
        ],
      },
      {
        id: "weatherParams_hourly",
        description: "Select one or more <b> hourly weather </b> parameters:",
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
            label: "Temperature at 2 meters above ground in °C [P2076]",
            value: "temperature_2m",
          },
          {
            id: "relative_humidity_2m",
            label: "Relative humidity at 2 meters above ground in % [P5596]",
            value: "relative_humidity_2m",
          },
          {
            id: "precipitation",
            label: "Precipitation (rain + snow) in mm [P3036]",
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
