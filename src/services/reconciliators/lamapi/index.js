export default {
  private: {
    endpoint: process.env.LAMAPI,
    token: process.env.LAMAPI_TOKEN,
    processRequest: true
  },
  public: {
    name: 'LamAPI',
    prefix: 'wiki',
    relativeUrl: '/lamapi',
    description: 'Provides a general-purpose reconciliation against Wikidata using LamAPI. This service might be slower than others.',
    uri: 'https://www.wikidata.org/wiki/',
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
      types: {
        label: 'Types',
        type: 'subList'
      },
      description: {
        label: 'Description'
      },
      match: {
        label: 'Match',
        type: 'tag'
      }
    }
  }
}