export default {
  private: {
    endpoint: process.env.ATOKA_DETAILS,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Atoka Extender',
    relativeUrl: '',
    description: 'Select the companies column and extend the field in another column',
    formParams: [
      {
        id: 'property',
        description: 'Select one or more <b>Property</b> values:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'fullAddress',
            label: 'Address',
            value: 'fullAddress'
          },
          {
            id: 'taxId',
            label: 'Tax ID',
            value: 'taxId'
          },
          {
            id: 'assets',
            label: 'Assets',
            value: 'assets'
          },
          {
            id: 'ateco',
            label: 'Ateco',
            value: 'ateco'
          },
          {
            id: 'ceo',
            label: 'CEO Name',
            value: 'ceo'
          }
        ]
      }
    ]
  }
}
