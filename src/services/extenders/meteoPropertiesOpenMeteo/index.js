export default {
    private: {
        endpoint: process.env.OPEN_METEO_ARCHIVE,
        processRequest: true
    },
    public: {
        name: 'Meteo Properties (OpenMeteo)',
        relativeUrl: '',
        description: 'Add properties for the geo points in the selected reconclied column ' +
            '(latitude,longitude) in a given day in another column (yyyy-mm-dd).' +
            '<br>Only dates prior to 10 days of the current date are covered. <br>All dates in CET timezone.<br>' +
            '<br><strong>Input</strong>: A column reconciled with latitute and longitude + a second ' +
            'column with dates.' +
            '<br><strong>Input format</strong>: geo coordinates IDs (lat,lon), like "georss:52.51604,13.37691", ' +
            'and dates in ISO8601 format (yyyy-mm-dd).' +
            '<br><strong>Output</strong>: A new column for every requested parameter. ' +
            'Output numbers can be in either comma or period notation.',
        formParams: [
            {
                id: 'dates',
                description: 'Select a column with the days on which to retrieve the weather data:',
                label: 'Select a column with days in ISO8601 format (yyyy-mm-dd)',
                infoText: 'Only dates prior to 10 days are covered (ISO8601 format yyyy-mm-dd)',
                inputType: 'selectColumns',
                rules: ['required']
            },
            {
                id: 'weatherParams',
                description: 'Select one or more <b>weather</b> parameters:',
                label: 'Weather parameters',
                infoText: 'Meteo parameters to extend the table',
                inputType: 'checkbox',
                rules: ['required'],
                options: [
                    {
                        id: 'apparent_temperature_max',
                        label: 'Maximum daily apparent temperature in °C',
                        value: 'apparent_temperature_max'
                    },
                    {
                        id: 'apparent_temperature_min',
                        label: 'Minimum daily apparent temperature in °C',
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
                id: 'decimalFormat',
                description: 'Select to change the default period notation (e.g., 12.3):',
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