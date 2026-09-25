export default {
    private: {
        endpoint: process.env.LAMAPI,
        token: process.env.LAMAPI_TOKEN,
        processRequest: true
    },
    public: {
        name: 'Annotation properties (Wikidata)',
        relativeUrl: '/entity/labels',
        description: 'An extender that extracts Wikidata metadata, such as <em>ID</em>, <em>URI</em>, <em>name</em>, ' +
          '<em>description</em>, from a reconciled column and populates them into new column(s).<br><br>' +
          '<strong>Input</strong>: A <em>column reconciled against Wikidata</em>, plus a <em>selection of the ' +
          'properties</em>:' +
          '<ul style="list-style-type: disc;">' +
            '<li>ID, in Wikidata format <code>wd:Q42</code></li>' +
            '<li>URI, as full URL [<a href="https://www.wikidata.org/wiki/Property:P856" target="_blank" rel="noopener noreferrer">P856</a>]</li>' +
            '<li>Name, as string [<a href="https://www.wikidata.org/wiki/Property:P1448" target="_blank" rel="noopener noreferrer">P1448</a>]</li>' +
            '<li>Description, as string</li>' +
          '</ul>' +
          '<strong>Output</strong>: A new column for each selected property, containing the corresponding Wikidata metadata.',
        formParams: [
            {
                id: 'labels',
                description: 'Select one or more <strong>properties</strong>:',
                label: 'wikidata labels',
                inputType: 'checkbox',
                rules: ['required'],
                options: [
                   {
                        id: 'id',
                        label: 'ID of entities in Wikidata',
                        value: 'id'
                    },
                    {
                        id: 'url',
                        label: 'URL of entities in Wikidata [P856]',
                        value: 'url'
                    },
                    {
                        id: 'name',
                        label: 'Name of entities in Wikidata [P1448]',
                        value: 'name'
                    },
                    {
                        id: 'description',
                        label: 'Description of entities in Wikidata',
                        value: 'description'
                    }
                ]
            }
        ]
    }
}
