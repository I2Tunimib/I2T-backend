export default {
  private: {
    endpoint: process.env.WD_HERE_GEOCOORDS,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true,
  },
  public: {
    name: "Geocoding: geo coordinates (HERE)",
    description:
      "A geographic reconciliation and linking service of locations at street address or greater granularity. " +
      "Annotations add IDs as geographical coordinates (lat,lng), names, and descriptions from HERE. <br>" +
      "<br><strong>Input</strong>: the content of the selected column, plus optional information taken from other columns." +
      "<br><strong>Output</strong>: Annotations (id and name) associated with body cells. Ids are formatted like " +
      '"georss:lat,lon". Names are the official Latin names of the addresses of the reconciled locations.',
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
        label: "Select columns from the list, then click ouside to confirm.",
        infoText: "",
        inputType: "multipleColumnSelect",
        rules: [],
      },
    ],
  },
};
