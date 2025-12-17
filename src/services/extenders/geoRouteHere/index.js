export default {
  private: {
    endpoint: process.env.WD_HERE_ROUTE,
    access_token: process.env.WD_HERE_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Geo Route (HERE)',
    relativeUrl: '',
    description: 'An extender that computes the route between the geographic points in the selected column <em>origin</em>' +
      'and those in the selected <em>destination</em> column.<br><br>' +
      '<strong>Input</strong>: A <em>column reconciled with latitute and longitude</em>; another <em>column containing ' +
      'either geo coordinates</em> (e.g., <code>georss:52.51604,13.37691</code>) or text labels of <em>Points of Interest ' +
      '(POI)</em>, plus a <em>selection of properties</em>:' +
      '<ul style="list-style-type: disc;">' +
        '<li>Route duration in minute</li>' +
        '<li>Route length in km</li>' +
        '<li>Route path from origin to destination in polyline format</li>' +
      '</ul>' +
      '<strong>Output</strong>: A new column for each selected route property.<br><br>' +
      '<strong>Notes</strong>: If the destination column contains POIs, enable the corresponding option so the ' +
      'service can resolve textual POI labels to geographic coordinates before computing the route.',
    formParams: [
      {
        id: 'end',
        description: 'Select the column containing <b>destination</b> locations:',
        label: 'Destination column',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'poi_property',
        description: 'Specify whether the destination column contains <strong>Points of Interest (POI)</strong>:\'',
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
        description: 'Select one or more <strong>properties</strong>:',
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
            label: 'Route path from origin to destination in polyline format',
            value: 'route'
          }
        ]
      }
    ]
  }
}
