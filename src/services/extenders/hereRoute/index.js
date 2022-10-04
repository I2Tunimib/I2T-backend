export default {
  private: {
    endpoint: process.env.WD_HERE_ROUTE,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true
  },
  public: {
    name: 'HERE Route',
    relativeUrl: '',
    description: 'Select two point and return the travel time',
    formParams: [
      {
        id: 'end',
        description: 'Select a <b>end</b> place column:',
        label: 'End point',
        infoText: 'Select one column as a end point',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'property',
        description: 'Select on or more <b>Property</b> values:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'duration',
            label: 'Route Duration',
            value: 'duration'
          },
          {
            id: 'length',
            label: 'Route Length',
            value: 'length'
          },
          {
            id: 'route',
            label: 'Route',
            value: 'route'
          },
          {
            id: 'poi',
            label: 'Allow POI',
            value: 'poi'
          }
        ]
      }
    ]
  }
}
