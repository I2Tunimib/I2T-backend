export default {
  private: {
    endpoint: "",
    processRequest: true
  },
  public: {
    name: 'Annotation properties',
    relativeUrl: '',
    description: 'Consolidate linking annotations into new column(s) with "id" and/or "name" of entities from the ' +
        'reconciled column. <br>' +
        '<br><strong>Input</strong>: A reconciled column against any dataset/knowledge graph + a selection of properties.' +
        '<br><strong>Input format</strong>: IDs in any format like "prefix:id" and names as strings.' +
        '<br><strong>Output</strong>: A new column for every requested property.',
    formParams: [
      {
        id: 'column',
        description: 'Please, re-select the column to extend:',
        label: 'Column to extend',
        infoText: 'Confirm this is the right column',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'property',
        description: 'Select one or more <b>property</b> values:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'id',
            label: 'The ID of entities in the reference dataset',
            value: 'id'
          },
          {
            id: 'name',
            label: 'The name of entities in the reference dataset',
            value: 'name'
          }
        ]
      }
    ]
  }
}
