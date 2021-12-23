export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (Keywords Matcher)',
    prefix: 'asiaKM',
    relativeUrl: '/asia/keywordsmatcher/',
    description: '',
    uri: 'http://www.jot-im.com/rdf/adwords',
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
