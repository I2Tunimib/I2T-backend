export default {
  private: {
    endpoint: process.env.OPEN_METEO_ARCHIVE,
    processRequest: true
  },
  public: {
    name: 'Meteo Properties (OpenMeteo)',
    relativeUrl: '',
    description: 'Add properties for the geo points in the selected reconclied column ' +
      '(latitude,longitude) in a given day in another column (yyyy-MM-dd or yyyy-MM-dd\'T\'HH:mm).' +
      '<br>Only dates prior to 5 days of the current date are covered. <br>All dates in CET timezone.<br>' +
      '<br><strong>Input</strong>: A column reconciled with latitute and longitude (e.g., geo coordinates IDs ' +
      '(lat,lon) - "georss:52.51604,13.37691") and a second column with dates in ISO8601 format (yyyy-MM-dd ' +
      'or yyyy-MM-dd\'T\'HH:mm).' +
      '<br><strong>Output</strong>: A new column for every requested parameter. ' +
      'Output numbers can be in either comma or period notation. <br><br><strong>Note: </strong> If the ' +
      'date column contains full datetime (yyyy-MM-dd\'T\'HH:mm) and daily parameters are selected, ' +
      'the hour information will be ignored.',
    formParams: [
      {
        id: 'dates',
        description: 'Select a column with the days in ISO8601 format (yyyy-MM-dd or yyyy-MM-dd\'T\'HH:mm):',
        label: 'Date column',
        infoText: 'Only dates prior to 10 days are covered (ISO8601 format yyyy-MM-dd or yyyy-MM-dd\'T\'HH:mm)',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'granularity',
        description: 'Select the data granularity:',
        label: 'Data granularity',
        inputType: 'radio',
        rules: ['required'],
        options: [
          { id: 'daily', label: 'Daily, returns values aggregated per day', value: 'daily'},
          { id: 'hourly', label: 'Hourly, returns values at a specific hour of a specific day', value: 'hourly'}
        ]
      },
      {
        id: 'weatherParams_daily',
        description: 'Select one or more <b> daily weather </b> parameters:',
        label: 'Daily weather parameters',
        infoText: 'Daily meteo parameters to extend the table',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          {
            id: 'daylight_duration',
            label: 'Number of seconds of daylight',
            value: 'daylight_duration'
          },
          {
            id: 'light_hours',
            label: 'Sun rise and set times UTC in ISO8601',
            value: 'light_hours'
          },
          {
            id: 'apparent_temperature_max',
            label: 'Maximum daily temperature in °C',
            value: 'apparent_temperature_max'
          },
          {
            id: 'apparent_temperature_min',
            label: 'Minimum daily temperature in °C',
            value: 'apparent_temperature_min'
          },
          {
            id: 'precipitation_sum',
            label: 'Sum of daily precipitation (including rain, showers and snowfall) in mm',
            value: 'precipitation_sum'
          },
          {
            id: 'precipitation_hours',
            label: 'The number of hours with rain',
            value: 'precipitation_hours'
          }
        ]
      },
      {
        id: 'weatherParams_hourly',
        description: 'Select one or more <b> hourly weather </b> parameters:',
        infoText: 'Hourly meteo parameters to extend the table',
        label: 'Hourly weather parameters',
        inputType: 'checkbox',
        rules: ['required'],
        options: [
          { id: 'temperature_2m', label: 'Temperature at 2 meters above ground in °C', value: 'temperature_2m' },
          { id: 'relative_humidity_2m', label: 'Relative humidity at 2 meters above ground in %', value: 'relative_humidity_2m' },
          { id: 'precipitation', label: 'Precipitation (rain + snow) in mm', value: 'precipitation' },
        ],
      },
      {
        id: 'decimalFormat',
        description: '<b>Optional. </b>Select to change the default period notation (e.g., 12.3):',
        label: 'Decimal format',
        inputType: 'checkbox',
        options: [
          {
            id: 'format',
            label: 'Use comma as decimal separator (e.g., 12,3)',
            value: 'comma'
          }
        ]
      }
    ]
  }
}
