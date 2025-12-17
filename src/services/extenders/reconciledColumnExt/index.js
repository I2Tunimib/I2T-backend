export default {
  private: {
    endpoint: "",
    processRequest: true
  },
  public: {
    name: 'Annotation properties',
    relativeUrl: '',
    description: 'An extender that consolidates existing linking annotations by generating new column(s) containing ' +
      '<em>ID</em> and/or <em>name</em> values from the reconciled column.<br><br>' +
      '<strong>Input</strong>: A <em> reconciled column </em> against any dataset or knowledge graph; ' +
      'a <em> selection of the properties</em>:' +
      '<ul style="list-style-type: disc;">' +
        '<li>ID, in any supported format <code>prefix:id</code></li>' +
        '<li>Name, as string</li>' +
      '</ul>' +
      '<strong>Output</strong>: One new column for each requested property, containing the ' +
      'extracted metadata from the reconciled entities.',
    formParams: [
      {
        id: 'property',
        description: 'Select one or more <b>properties</b>:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'id',
            label: 'ID of entities in the reference dataset',
            value: 'id'
          },
          {
            id: 'name',
            label: 'Name of entities in the reference dataset',
            value: 'name'
          }
        ]
      }
    ]
  }
}
