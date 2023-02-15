export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Parametric Wikidata SPARQL',
    relativeUrl: '/wikidata/entities',
    description: "Generic extension service that is based on Wikidata's KG, which allows you to specify the property to be extended in the form of text.",
    formParams: [
      {
        id: 'prop',
        description: "Enter <b>the Wikidata's property name</b>:",
        label: "Property Name",
        infoText: "To extend a new column, enter the property name as given in Wikidata.",
        inputType: 'text',
        defaultValue: '',
        rules: ['required']
      }
    ]
  }
}
