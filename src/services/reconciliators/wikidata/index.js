export default {
  private: {
    endpoint: process.env.WIKIDATA,
    processRequest: true
  },
  public: {
    name: 'Wikidata',
    prefix: 'wd',
    relativeUrl: '/wikidata',
    description: 'Provides a general-purpose reconciliation against Wikidata using OpenRefine. This service might be slower than others.',
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
      type: {
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