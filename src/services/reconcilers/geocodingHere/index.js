export default {
  private: {
    endpoint: process.env.WD_HERE_GEOCOORDS,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Geocoding: Geo Coordinates (HERE)",
    description:
      "A geographic reconciliation service that links location mentions to HERE entries, providing <em> street-level " +
      "or higher granularity </em> with latitude, longitude, names, and descriptions.<br><br>" +
      "<strong>Input</strong>: A <em>column of location mentions</em> to reconcile; plus optional information taken " +
      "from other columns providing context to improve reconciliation accuracy.<br>" +
      "<strong>Output</strong>: Annotations for each matched mention, including <em> ID</em> (formatted as " +
      "<code>georss:lat,lon</code>), <em> name</em> (official Latin name of the address) and " +
      "<em> description </em>.<br><br> <strong>Note</strong>: Requires access to the HERE API",
    relativeUrl: "/here",
    prefix: "georss",
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
        label: "Select columns",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
