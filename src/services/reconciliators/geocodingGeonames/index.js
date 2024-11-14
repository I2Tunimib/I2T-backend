export default {
    private: {
        endpoint: process.env.GEONAMES,
        access_token: process.env.GEONAMES_TOKEN,
        processRequest: true
    },
    public: {
        name: 'Geocoding: geo coordinates (GeoNames)',
        description: 'A geographic reconciliation and linking service of locations at city or grater granularity. ' +
            'Annotations add IDs as geographical coordinates (lat,lng), labels, and descriptions from GeoNames. <br>' +
            '<br><strong>Input</strong>: the content of the selected column, plus optional information taken from other columns. ' +
            '<br><strong>Output</strong>: Annotations associated with column cells in W3C compliant format.',
        relativeUrl: '/dataset',
        prefix: 'geoCoord',
        uri: 'http://www.google.com/maps/place/',
        metaToView: {
            id: {
                label: 'ID',
            },
            name: {
                label: 'Name',
                type: 'link'
            },
            score: {
                label: 'Score'
            },
            type: {
                label: 'Types',
                type: 'subList'
            },
            match: {
                label: 'Match',
                type: 'tag'
            }
        },
        formParams: [
            {
                id: 'secondPart',
                description: "Optional column to add information to support reconciliation.",
                label: "Select a column with information about the location to reconcile",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            },
            {
                id: 'thirdPart',
                description: "Optional column to add information to support reconciliation.",
                label: "Select a column with information about the location to reconcile",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            },
            {
                id: 'fourthPart',
                description: "Optional column to add information to support reconciliation.",
                label: "Select a column with information about the location to reconcile",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            }
        ]
    }
}
