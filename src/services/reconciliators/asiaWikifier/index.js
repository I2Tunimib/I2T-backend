export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (Wikifier)',
    prefix: 'dbp',
    relativeUrl: '/asia/wikifier',
    description: 'Reconcile entities to DBPedia using ASIA.',
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