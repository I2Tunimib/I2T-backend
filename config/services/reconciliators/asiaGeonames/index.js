export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (geonames)',
    prefix: 'geo',
    relativeUrl: '/asia/geonames',
    description: '',
    uri: 'http://www.geonames.org/',
    metaToViz: ['id', 'name', 'score', 'match']
  }
}