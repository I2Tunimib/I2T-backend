export default {
  private: {
    endpoint: process.env.ASIA_RECONCILIATION
  },
  public: {
    name: 'ASIA (Wikifier)',
    prefix: 'asiaWk',
    relativeUrl: '/asia/wikifier',
    description: '',
    uri: '',
    metaToViz: ['id', 'name', 'score', 'match']
  }
}
