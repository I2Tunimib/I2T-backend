export default {
  private: {
    endpoint: process.env.ATOKA_PEOPLE,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Atoka People Extender',
    relativeUrl: '/atoka/people',
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
            id: 'legalName',
            label: 'Legal Name',
            value: 'legalName'
          },
          {
            id: 'roles',
            label: 'Roles',
            value: 'roles'
          },
          {
            id: 'count',
            label: 'Count',
            value: 'count'
          },
          {
            id: 'id',
            label: 'Company Atoka id',
            value: 'id'
          },
          {
            id: 'address',
            label: 'Address',
            value: 'address'
          },
          {
            id: 'residenceAddress',
            label: 'Residence Address',
            value: 'residenceAddress'
          }
        ]
      }
    ]
  }
}
