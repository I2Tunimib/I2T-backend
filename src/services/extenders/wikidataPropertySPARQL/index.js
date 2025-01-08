export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Wikidata properties',
    relativeUrl: '/wikidata/entities',
    description: 'Retrieve Wikidata properties for the entities in the selected column' +
      ' <br> Supply a list of <italic>*properties*</italic> separated by space (e.g., P625 P2044 ). <br>' +
      'For each property, a new column, headed with the Wikidata label of the property, is added. <br>' +
      'Note that, for each property, only one value per entity is returned. <br>' +
      'Note that some values may be missing in Wikidata.',
    formParams: [
      {
        id: 'properties',
        description: '<strong>Write the list of desired properties</strong>',
        label: '*properties* e.g.: P625 P2044 ',
        inputType: 'text',
        rules: ['required']
      }
    ]
  }
}
