export default {
  private: {
    endpoint: process.env.WIKIDATA
  },
  public: {
    name: 'Wikidata',
    prefix: 'wkd',
    relativeUrl: '/wikidata',
    description: '',
    uri: '',
    metaToViz: ['id', 'name', 'score', 'match']
  }
}