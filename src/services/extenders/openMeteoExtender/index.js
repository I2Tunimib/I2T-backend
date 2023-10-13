export default {
    private: {
        endpoint: process.env.OPEN_METEO_ARCHIVE,
        processRequest: true
    },
    public: {
        name: 'Open Meteo Properties',
        relativeUrl: '',
        description: 'Meteo property extension service: add properties from latitude/longitude and and day of the month.' +
            ' Only dates prior to 10 days of the current date are covered (ISO8601 format yyyy-mm-dd). All dates in CET timezone.',
        formParams: [
            {
                id: 'dates',
                description: 'Select a column with the days on which you want the weather data:',
                label: 'Select a column with dates in ISO8601 format',
                infoText: 'Only dates prior to 10 days are covered (ISO8601 format yyyy-mm-dd)',
                inputType: 'selectColumns',
                rules: ['required']
            },
            {
                id: 'weatherParams',
                description: 'Select one or more <b>Weather</b> parameters:',
                label: 'Weather parameters',
                infoText: 'Meteo parameters to extend the table',
                inputType: 'checkbox',
                rules: ['required'],
                options: [
                    {
                        id: 'apparent_temperature_max',
                        label: 'apparent_temperature_max',
                        value: 'apparent_temperature_max'
                    },
                    {
                        id: 'apparent_temperature_min',
                        label: 'apparent_temperature_min',
                        value: 'apparent_temperature_min'
                    },
                    {
                        id: 'precipitation_sum',
                        label: 'precipitation_sum',
                        value: 'precipitation_sum'
                    },
                    {
                        id: 'precipitation_hours',
                        label: 'precipitation_hours',
                        value: 'precipitation_hours'
                    }
                ]
            }
        ]
    }
}