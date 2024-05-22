export default {
  private: {
    endpoint: process.env.WD_HERE_ROUTE,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Geo Route (HERE)',
    relativeUrl: '',
    description: 'Compute the route between the geo points in the column (origin) to the locations the selected columns ' +
        '(destination).<br>' +
        '<br><strong>Input</strong>: A column reconciled with latitute and longitude + a second ' +
        'column with labels of point of interests (POI) or geo coordinates.' +
        '<br><strong>Input format</strong>: geo coordinates IDs, like "georss:52.51604,13.37691", or strings for POI.' +
        '<br><strong>Output</strong>: A new column for every requested property.',
    formParams: [
      {
        id: 'end',
        description: 'Select a <b>destination</b> column:',
        label: 'Select a column with destination locations',
        infoText: 'Select a column with destination locations.',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'poi_property',
        description: 'Select if destinations are <strong>POI</strong>s:',
        label: 'poi_property',
        inputType: 'checkbox',
        rules: [],
        options: [
          {
            id: 'poi',
            label: 'Use POI for the destination column',
            value: 'poi'
          }
        ]
      },
      {
        id: 'property',
        description: 'Select one or more <strong>property</strong>:',
        label: 'Property',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'duration',
            label: 'Route duration in minutes',
            value: 'duration'
          },
          {
            id: 'length',
            label: 'Route length in km',
            value: 'length'
          },
          {
            id: 'route',
            label: 'Route path between origin to destination in polyline format',
            value: 'route'
          }
        ]
      }
    ]
  }
}
