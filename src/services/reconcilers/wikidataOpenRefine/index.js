export default {
  private: {
    endpoint: process.env.WIKIDATA,
    processRequest: true
  },
  public: {
    name: 'Linking: Wikidata (OpenRefine)',
    prefix: 'wd',
    relativeUrl: '/wikidata',
    description: 'A general purpose reconciliation service using the OpenRefine API, adding Wikidata IDs, labels, ' +
      'and descriptions.<br><br> <strong>Input</strong>: A <em>column of mentions</em> (strings) to reconcile.<br>' +
      '<strong>Output</strong>: Metadata associated with mentions in row cells and schema headers, including ' +
      '<em>ID</em>, <em>label</em> and <em>description</em> in W3C-compliant format.<br><br>' +
      '<strong>Note</strong>: Requires access to the OpenRefine reconciliation API; Reconciliation is performed ' +
      'without using other columns for context, which may reduce accuracy compared to other services.',
    uri: 'https://www.wikidata.org/wiki/',
    searchPattern: "https://www.wikidata.org/w/index.php?search={label}",
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
