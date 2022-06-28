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
    prefix: 'here',
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
    }
  }
}