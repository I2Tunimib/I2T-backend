export default {
  private: {
    endpoint: process.env.WD_ENTITY_DATA,
    processRequest: true
  },
  public: {
    name: 'Geo Properties (Wikidata)',
    relativeUrl: '/wikidata/entities',
    description: 'Add properties associated with wikidata entities. Note that some required properties may be missing in Wikidata.',
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