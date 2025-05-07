export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Wikidata properties',
    relativeUrl: '/wikidata/entities',
    description: 'Exstend with Wikidata properties for the entities in the selected column.' +
      ' <br> Supply a list of <strong>*properties*</strong> separated by space (e.g., P625 P2044 ). <br>' +
      'For each property, a new column, headed with the Wikidata name of the property, is added. <br>' +
      '<strong>Note</strong>: for each property, only one value per entity is returned. <br>' +
      '<strong>Note</strong>: some values may be missing in Wikidata. <br>' +
      'The Suggest button retrieves the list of available properties and their frequencies.',
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
