export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (geonames)',
    prefix: 'geo',
    relativeUrl: '/asia/geonames',
    description: 'Reconcile entities to Geonames using ASIA.',
    uri: 'http://www.geonames.org/',
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