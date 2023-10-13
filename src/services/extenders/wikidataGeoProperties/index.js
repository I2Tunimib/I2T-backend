export default {
  private: {
    endpoint: process.env.WD_ENTITY_DATA,
    processRequest: true
  },
  public: {
    name: 'Wikidata Geo Properties',
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
            id: 'P625',
            label: 'Coordinate location (Lat & Lon)',
            value: 'P625'
          },
          {
            id: 'P421',
            label: 'Time zone',
            value: 'P421'
          },
          {
            id: 'P281',
            label: 'Postal code',
            value: 'P281'
          }
        ]
      }
    ]
  }
}