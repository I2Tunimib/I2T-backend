export default {
  private: {
    endpoint: "",
    processRequest: true
  },
  public: {
    name: 'Column Extender',
    relativeUrl: '',
    description: 'Select the Address column and extend the metadata in new columns',
    formSchema: {
      column: {
        description: 'To be sure, reselect the column to extend:',
        label: 'Column to extend',
        infoText: 'Check that is the right column',
        component: 'selectColumns',
        rules: ['required']
      },
      property: {
        description: 'Select one or more <b>Property</b> values:',
        label: 'Property',
        component: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'id',
            label: 'Reconciliation ID',
            value: 'id'
          },
          {
            id: 'name',
            label: 'Reconciliation Name',
            value: 'name'
          }
        ]
      }
    }
  }
}
