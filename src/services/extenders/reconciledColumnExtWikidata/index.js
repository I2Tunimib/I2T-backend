export default {
    private: {
        endpoint: process.env.LAMAPI,
        token: process.env.LAMAPI_TOKEN,
        processRequest: true
    },
    public: {
        name: 'Reconciled Column Extender (Wikidata)',
        relativeUrl: '/entity/labels',
        description: 'Consolidate wikidata ID, URI, name or descriptions of entities in the selected column.' +
            '<br><strong>Input</strong>: A column reconciled against Wikidata + a selection of properties.' +
            '<br><strong>Output</strong>: A new column for every requested property.',
        formParams: [
            {
                id: 'labels',
                description: 'Select one or more <strong>properties</strong>properties:',
                label: 'wikidata labels',
                infoText: 'Labels to extend the table',
                inputType: 'checkbox',
                rules: ['required'],
                options: [
                   {
                        id: 'id',
                        label: 'The ID of entities in Wikidata',
                        value: 'id'
                    },
                    {
                        id: 'url',
                        label: 'The URL of entities in Wikidata',
                        value: 'url'
                    },
                    {
                        id: 'name',
                        label: 'The name of entities in Wikidata',
                        value: 'name'
                    },
                    {
                        id: 'description',
                        label: 'The description of entities in Wikidata',
                        value: 'description'
                    }
                ]
            }
        ]
    }
}