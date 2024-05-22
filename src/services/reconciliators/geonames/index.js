export default {
    private: {
        endpoint: process.env.GEONAMES,
        access_token: process.env.GEONAMES_TOKEN,
        processRequest: true
    },
    public: {
        name: 'Geonames linking service',
        description: 'A geographic reconciliation and linking service that adds IDs, labels, and descriptions ' +
            'from Geonames. ' +
            '*** Input: A column with mentions (strings) strings to reconcile, and possibly ' +
            'more columns to set a context for more accurate results. ' +
            '*** Output: Annotations associated with column cells cells in W3C compliant format.',
        relativeUrl: '/dataset',
        prefix: 'geo',
        uri: 'http://www.geonames.org/',
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
