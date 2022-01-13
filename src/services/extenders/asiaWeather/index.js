export default {
  private: {
    endpoint: process.env.ASIA_EXTENSION
  },
  public: {
    name: 'Weather',
    relativeUrl: '/asia/weather',
    description: "ASIA weather-based extension service allows to extend a column with meteorological data for given locations and dates. The selected locations needs to be <b>regions</b> reconciliated against geonames. If regions aren't directly available, you can use the ASIA (geonames) extension service to extend cities with their regions.",
    formParams: [
      {
        id: 'dates',
        description: 'Select a column for <b>Dates</b> values:',
        label: 'Dates',
        infoText: 'Only date for the years between 2017 and 2019 and German regions are supported (ISO format yyyy-mm-dd)',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'weatherParams',
        description: 'Select one or more <b>Weather</b> parameters:',
        label: 'Weather parameters',
        infoText: 'Meteorological parameter with which you want to extend the table',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'ws',
            value: 'ws',
            label: 'Wind speed'
          },
          {
            id: '2t',
            value: '2t',
            label: '2 metre temperature'
          },
          {
            id: '2d',
            value: '2d',
            label: '2 metre dewpoint temperature'
          },
          {
            id: 'sund',
            value: 'sund',
            label: 'Sunshine duration'
          }
        ]
      },
      {
        id: 'offsets',
        description: "Enter desired <b>Offsets</b>:",
        label: "Offset",
        infoText: "The offset is the difference in days for which we want to retrieve the data with respect to the input dates. You can add multiple offsets separated by a COMMA",
        inputType: 'text',
        defaultValue: '0',
        rules: ['required']
      }
    ]
  }
}