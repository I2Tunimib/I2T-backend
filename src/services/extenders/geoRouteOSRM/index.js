export default {
  private: {
    endpoint: process.env.WD_OSRM_ENDPOINT,
    processRequest: true
  },
  public: {
    name: 'Geo Route (OSRM)',
    relativeUrl: '',
    description: 'An extender that computes the route between the geographic points in the selected column <em>origin</em>' +
      'and those in the selected <em>destination</em> column.<br><br>' +
      '<strong>Input</strong>: A <em>column reconciled with latitute and longitude</em>; another <em>column containing ' +
      'either geo coordinates</em> (e.g., <code>georss:52.51604,13.37691</code>) or text labels of <em>Points of Interest ' +
      '(POI)</em> already reconcilied with its coordinates, plus a <em>selection of properties</em>:' +
      '<ul style="list-style-type: disc;">' +
        '<li>Route duration in minute</li>' +
        '<li>Route length in km</li>' +
        '<li>Route path from origin to destination in polyline format</li>' +
      '</ul>' +
      '<strong>Output</strong>: A new column for each selected route property.',
    formParams: [
      {
        id: 'end',
        description: 'Select the column containing <b>destination</b> locations:',
        label: 'Destination column',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: "mode",
        description: "Select the travel mode for route calculation:",
        label: "Travel Mode",
        inputType: "radio",
        rules: ["required"],
        options: [
          {
            id: "car",
            label: "By car",
            value: "car",
          },
          {
            id: "foot",
            label:
              "By foot",
            value: "foot",
          },
        ],
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
