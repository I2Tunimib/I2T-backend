export default {
    private: {
        endpoint: process.env.ALLIGATOR,
        access_token: process.env.ALLIGATOR_AUTH_TOKEN,
        processRequest: true
    },
    public: {
        name: 'Linking: Wikidata (Alligator)',
        description: 'A general purpose reconciliation and linking service that use Alligator to add Wikidata IDs, ' +
            'labels, descriptions and types to body cells (mentions), and types and properties ' +
            'to header cells (schema). <br>' +
            '<br><strong>Input</strong>: A column with mentions (strings) to reconcile, and possibly ' +
            'more columns to set a context for more accurate results. ' +
            '<br><strong>Output</strong>: Metadata associated with body cells and schema cells in W3C compliant format.',
        relativeUrl: '/dataset',
        prefix: 'wdA',
        uri: 'https://www.wikidata.org/wiki/',
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
                id: 'column2',
                description: "Optional column to set the context.",
                label: "Select a column to set the context",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            },
            {
                id: 'column3',
                description: "Optional column to set the context.",
                label: "Select a column to set the context",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            },
            {
                id: 'column4',
                description: "Optional column to set the context.",
                label: "Select a column to set the context",
                infoText: "",
                inputType: 'selectColumns',
                rules: []
            }
        ]
    }
}
