export default {
  private: {
    endpoint: process.env.GEONAMES,
    access_token: process.env.GEONAMES_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Linking: GeoNames (GeoNames)",
    description:
      "A geographic reconciliation and linking service that adds GeoNames IDs, labels, and " +
      "descriptions. <br>" +
      "<br><strong>Input</strong>: A column with mentions (strings) to reconcile, and possibly " +
      "more columns to set a context for more accurate results. " +
      "<br><strong>Output</strong>: Annotations associated with column cells in W3C compliant format.",
    relativeUrl: "/dataset",
    prefix: "geo",
    uri: "http://www.geonames.org/",
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
          "Optional columns to add information to support reconciliation.",
        label:
          "Select columns with information about the location to reconcile",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
