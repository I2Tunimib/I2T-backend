export default {
    private: {
      endpoint: process.env.WD_SPARQL,
      processRequest: true
    },
    public: {
      name: 'Wikidata Geo Properties SPARQL',
      relativeUrl: '/wikidata/entities',
      description: 'Geo property extension service: add properties associated with wikidata entities. Note that info may be missing in Wikidata.',
      formParams: [
        {
          id: 'property',
          description: 'Select on or more <b>Property</b> values:',
          label: 'Property',
          inputType: 'checkbox',
          rules: ['required'],
          options: [
            {
              id: 'wdt:P625',
              label: 'Coordinate location (Lat & Lon)',
              value: 'wdt:P625'
            },
             {
              id: 'wdt:P421',
              label: 'Time Zone',
              value: 'wdt:P421'
            },
            {
              id: 'wdt:P281',
              label: 'Postal Code',
              value: 'wdt:P281'
            }
          ]
        }
      ]
    }
  }
