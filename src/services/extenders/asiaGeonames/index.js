import { FormComponents, FormFieldRules } from "../../../schemas/constants";

export default {
  private: {
    endpoint: process.env.ASIA_EXTENSION,
    processRequest: true
  },
  public: {
    name: 'ASIA (geonames)',
    relativeUrl: '/asia/geonames',
    description: 'ASIA extension service based on geonames allows to extend a column with data on locations of a certain administrative order. The input column has to be reconciliated against geonames entities.',
    formSchema: {
      property: {
        description: 'Select on or more <b>Property</b> values:',
        label: 'Property',
        component: FormComponents.checkbox,
        rules: [FormFieldRules.required],
        options: [
          {
            id: 'adm1',
            label: 'First-order administrative division (Regions or States)',
            value: 'parentADM1'
          },
          {
            id: 'adm2',
            label: 'Second-order administrative division (Provinces)',
            value: 'parentADM2'
          },
          {
            id: 'adm3',
            label: 'Third-order administrative division (Communes)',
            value: 'parentADM3'
          },
          {
            id: 'adm4',
            label: 'Fourth-order administrative division',
            value: 'parentADM4'
          }
        ]
      }
    }
  }

}