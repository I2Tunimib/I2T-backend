export default {
  private: {
    endpoint: process.env.WIKIDATA
  },
  public: {
    name: 'Wikidata',
    prefix: 'wkd',
    relativeUrl: '/wikidata',
    description: '',
    uri: 'https://www.wikidata.org/wiki',
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