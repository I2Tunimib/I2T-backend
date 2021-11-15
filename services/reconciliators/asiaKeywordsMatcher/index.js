export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (Keywords Matcher)',
    prefix: 'asiaKM',
    relativeUrl: '/asia/keywordsmatcher',
    description: '',
    uri: 'http://www.geonames.org/',
    metaToViz: ['id', 'name', 'score', 'match']
  }
}
