export default {
  private: {
    endpoint: process.env.WIKIDATA,
    processRequest: true
  },
  public: {
    name: 'Wikidata',
    prefix: 'wd',
    relativeUrl: '/wikidata',
    description: 'Provides a general-purpose reconciliation against Wikidata using using OpenRefine. This service might be slower than others.',
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
    },
    formParams: [
      {
        id: 'dates',
        description: 'Select a column for <b>Dates</b> values:',
        label: 'Dates',
        infoText: 'Only date for the years between 2017 and 2019 and German regions are supported (ISO format yyyy-mm-dd)',
        inputType: 'selectColumns',
        rules: ['required']
      },
    ]

  }
}