export default {
  private: {
    endpoint: process.env.GEONAMES,
    access_token: process.env.GEONAMES_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Geocoding: geo coordinates (GeoNames)",
    description:
      "A geographic reconciliation and linking service of locations at city or greater granularity. " +
      "Annotations add IDs as geographical coordinates (lat,lng), labels, and descriptions from GeoNames. <br>" +
      "<br><strong>Input</strong>: The mentions in the selected column, plus optional context information from other columns. " +
      "<br><strong>Output</strong>: Annotations associated with mentions in row cells in W3C compliant format.",
    relativeUrl: "/dataset",
    prefix: "geoCoord",
    uri: "http://www.google.com/maps/place/",
    metaToView: {
      id: {
        label: "ID",
      },
      name: {
        label: "Name",
        type: "link",
      },
      score: {
        label: "Score",
      },
      type: {
        label: "Types",
        type: "subList",
      },
      match: {
        label: "Match",
        type: "tag",
      },
    },
    formParams: [
      {
        id: "additionalColumns",
        description:
          "Optional columns that provide context to support reconciliation.",
        label:
          "Select columns from the list, then click ouside to confirm.",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
