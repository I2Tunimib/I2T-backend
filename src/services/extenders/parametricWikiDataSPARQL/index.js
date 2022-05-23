export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Parametric Wikidata SPARQL',
    relativeUrl: '/wikidata/entities',
    description: "Inserendo il nome della proprietà da ricercare viene estesa la tabella",
    formParams: [
      {
        id: 'prop',
        description: "Inserire <b>il nome della proprietà</b>:",
        label: "Nome Proprietà",
        infoText: "Per estendere la tabella inserire il nome della proprietà come riportato in Wikidata",
        inputType: 'text',
        defaultValue: '',
        rules: ['required']
      }
    ]
  }
}
