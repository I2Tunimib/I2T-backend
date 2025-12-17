export default {
  private: {
    endpoint: process.env.WD_ENTITY_DATA,
    processRequest: true,
  },
  public: {
    uri: "https://www.wikidata.org/wiki/",
    name: "Geo Properties (Wikidata)",
    relativeUrl: "/wikidata/entities",
    description: "An extender that retrieves geographic properties from Wikidata for the entities in the selected " +
      "reconciled column.<br><br>" +
      "<strong>Input</strong>: A <em>column reconciled against Wikidata</em>, with entities' ID in any supported " +
      "format (e.g., <code>wd:Q42</code>), plus a <em>selection of geographic properties</em>:" +
      "<ul style='list-style-type: disc;'>" +
        "<li>Coordinate location (latitude & longitude)</li>" +
        "<li>Time zone</li>" +
        "<li>Postal code</li>" +
      "</ul>" +
      "<strong>Output</strong>: One new column for each selected property, populated with the corresponding values " +
      "retrieved from Wikidata.<br><br>" +
      "<strong>Note</strong>: Some entities may lack one or more of the requested properties in Wikidata.",
    formParams: [
      {
        id: "property",
        description: "Select one or more <b>properties</b>:",
        label: "Property",
        inputType: "checkbox",
        rules: ["required"],
        options: [
          {
            id: "P625",
            label: "Coordinate location (Lat & Lon)",
            value: "P625",
          },
          {
            id: "P421",
            label: "Time zone",
            value: "P421",
          },
          {
            id: "P281",
            label: "Postal code",
            value: "P281",
          },
        ],
      },
    ],
  },
};
