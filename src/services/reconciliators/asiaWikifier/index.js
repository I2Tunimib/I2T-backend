export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION,
    processRequest: true
  },
  public: {
    name: 'ASIA (Wikifier)',
    prefix: 'dbp',
    relativeUrl: '/asia/wikifier',
    description: 'Provides a general-purpose reconciliation against DBPedia using ASIA.',
    uri: 'http://dbpedia.org/resource/',
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
