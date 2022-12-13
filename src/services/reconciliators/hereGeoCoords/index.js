export default {
  private: {
    endpoint: process.env.WD_HERE_GEOCOORDS,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Here Geo Location',
    description: 'Get the coordinates from the address as a unique identifier.',
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
        description: "Possibilità di inserire un secondo pezzo per l'indirizzo.",
        label: "Seconda parte dell'indirizzo",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'thirdPart',
        description: "Possibilità di inserire un terzo pezzo per l'indirizzo.",
        label: "Terzo parte dell'indirizzo",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'fourthPart',
        description: "Possibilità di inserire un quarto pezzo per l'indirizzo.",
        label: "Quarta parte dell'indirizzo",
        infoText: "",
        inputType: 'selectColumns',
        rules: []
      }
    ]
  }
}
