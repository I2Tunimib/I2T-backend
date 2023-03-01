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
    formSchema: {
      secondPart: {
        description: "Possibility of using a second column that contains data about the full address.",
        label: "Column contains the second part of address",
        infoText: "",
        component: 'selectColumns',
        rules: []
      },
      thirdPart: {
        description: "Possibility of using a third column that contains data about the full address.",
        label: "Column contains the third part of address",
        infoText: "",
        component: 'selectColumns',
        rules: []
      },
      fourthParth: {
        description: "Possibility of using a fourth column that contains data about the full address.",
        label: "Column contains the fourth part of address",
        infoText: "",
        component: 'selectColumns',
        rules: []
      }
    }
  }
}
