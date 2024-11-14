export default {
  private: {
    endpoint: process.env.WD_HERE_GEOCOORDS,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Geocoding: geo coordinates (HERE)',
    description: 'A geographic reconciliation and linking service of locations at street address or grater granularity. ' +
        'Annotations add IDs as geographical coordinates (lat,lng), labels, and descriptions from HERE. <br>' +
        '<br><strong>Input</strong>: the content of the selected column, plus optional information taken from other columns.' +
        '<br><strong>Output</strong>: Annotations (id and name) associated with body cells. Ids are formatted like ' +
        '"georss:lat,lon". Names are the official Latin names of the addresses of the reconciled locations.',
    relativeUrl: '/here',
    prefix: 'georss',
    uri: 'http://www.google.com/maps/place/',
    metaToView: {
      id: {
        label: 'ID',
      },
      name: {
        label: 'Name',
        type: 'link'
      },
      score: {
        label: 'Score'
      },
      type: {
        label: 'Types',
        type: 'subList'
      },
      match: {
        label: 'Match',
        type: 'tag'
      }
    },
    formParams: [
      {
        id: 'secondPart',
        description: "Optional column to add information to support reconciliation.",
        label: "Select a column with information about the location to reconcile",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'thirdPart',
        description: "Optional column to add information to support reconciliation.",
        label: "Select a column with information about the location to reconcile",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'fourthPart',
        description: "Optional column to add information to support reconciliation.",
        label: "Select a column with information about the location to reconcile",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      }
    ]
  }
}
