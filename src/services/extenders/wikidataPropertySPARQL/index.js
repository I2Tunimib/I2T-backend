export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Wikidata properties',
    relativeUrl: '/wikidata/entities',
    description: 'An extender that adds Wikidata properties for entities in the selected column.<br><br>' +
      '<strong>Input</strong>: A <em>reconciled column</em> with entities; plus a <em>list of Wikidata properties</em> ' +
      'to retrieve, separated by space (e.g., P625 P2044).<br>' +
      '<strong>Output</strong>: One new column for each requested property, headed with the property\'s ' +
      'official Wikidata label, containing the corresponding value(s) for each entity.<br><br>' +
      '<strong>Notes</strong>: Some properties may be missing for certain entities in Wikidata. The Suggest button ' +
      'can be used to retrieve a list of available properties along with their frequencies.',
    formParams: [
      {
        id: 'properties',
        description: '<strong>Write the list of desired properties</strong>',
        label: '*properties* e.g.: P625 P2044',
        inputType: 'text',
        rules: ['required']
      }
    ]
  }
}
