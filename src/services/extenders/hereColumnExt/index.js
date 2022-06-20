export default {
  private: {
    endpoint: "",
    processRequest: true
  },
  public: {
    name: 'HERE Column Extender',
    relativeUrl: '',
    description: 'Select the Address column and extend the metadata in new columns',
    formParams: [
      {
        id: 'column',
        description: 'To be sure, reselect the column to extend:',
        label: 'Column to extend',
        infoText: 'Check that is the right column',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'property',
        description: 'Select one or more <b>Property</b> values:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'coordinates',
            label: 'Geo Coordinates',
            value: 'geocoordinates'
          },
          {
            id: 'latinName',
            label: 'English Name',
            value: 'english_name'
          }
        ]
      }
    ]
  }
}
