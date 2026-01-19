export default {
  private: {
    endpoint: process.env.GEONAMES,
    access_token: process.env.GEONAMES_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Geocoding: Geo Coordinates (GeoNames)",
    description:
      "A geographic reconciliation service that links location mentions to GeoNames entries, providing " +
      "<em> city-level or higher granularity </em> with latitude, longitude, labels, and descriptions.<br><br>" +
      "<strong>Input</strong>: A <em>column of location mentions</em> to reconcile; plus optional information taken " +
      "other columns providing context to improve reconciliation accuracy.<br>" +
      "<strong>Output</strong>: Annotations for each matched mention, including <em> ID</em>, <em> latitude</em>," +
      "<em> longitude</em>, <em> label</em> and <em> description </em> in a W3C-compliant format.<br><br>" +
      "<strong>Note</strong>: Requires access to the GeoNames service",
    relativeUrl: "/dataset",
    prefix: "geoCoord",
    uri: "http://www.google.com/maps/place/",
    searchPattern: "https://www.google.com/maps/place/{label}/",
    listTypes: "http://www.geonames.org/export/codes.html",
    listProps: "https://www.wikidata.org/wiki/Special:ListProperties",
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
          "Select columns",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
