export default {
  private: {
    endpoint: process.env.WIKIDATA,
    processRequest: true
  },
  public: {
    name: 'Linking: Wikidata (OpenRefine)',
    prefix: 'wd',
    relativeUrl: '/wikidata',
    description: 'A general-purpose reconciliation service based on OpenRefine API. Add Wikidata IDs, labels and ' +
        'descriptions. <br>' +
        '<br><strong>Input</strong>: A column with mentions (strings) to reconcile. ' +
        '<br><strong>Output</strong>: Metadata associated with mentions in row cells and schema headers in W3C compliant format.',
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
