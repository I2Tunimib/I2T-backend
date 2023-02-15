import { FormComponents, FormInputTypes } from "./form-components";



export const reconciliator = ({ name, description, prefix, relativeUrl, uri, metaToView, form }) => {

  return builder;
  // return {
  //   name,
  //   description,
  //   prefix,
  //   relativeUrl,
  //   uri
  // }
}


export const createService = (serviceType, { processRequest = true, endpoint, ...rest }) => {
  return {
    private: {
      processRequest,
      endpoint,
      ...rest
    },
    public: serviceType
  }
}


export const createReconciliator = ({ name, description, prefix, relativeUrl, uri }, { processRequest, endpoint, ...rest }) => {

  const service = {
    private: {
      processRequest,
      endpoint,
      ...rest
    },
    public: {
      name,
      description,
      prefix,
      relativeUrl,
      uri
    }
  };
  const t = '';

  const builder = {
    addMetaToView: () => {
      t = 'test';
      return { addForm: builder.addForm }
    },
    addForm: () => {
      if (t === 'test') {
        return service;
      }
      return { addMetaToView: builder.addMetaToView }
    }
  }

  return builder;

  // return builder;
  // return {
  //   return {
  //     private: {
  //       processRequest,
  //       endpoint,
  //       ...rest
  //     },
  //     public: serviceType
  //   }
  // }
}

const metaItem = ({ label, type }) => {
  return {
    label,
    type
  }
}

const MetaToViewComponents = {
  link: 'link',
  sublist: 'subList',
  tag: 'tag'
}





const { form, field, option } = FormComponents;
const { checkbox, input, selectColumns } = FormInputTypes;
const { link, sublist, tag } = MetaToViewComponents;

const service = createReconciliator({
  name: 'ASIA (geonames)',
  prefix: 'geo',
  relativeUrl: '/asia/geonames',
  description: 'Reconcile entities to Geonames using ASIA. This service might prove useful when reconciling geospatial entities (places).',
  uri: 'http://www.geonames.org/',
  formParams: form([
    field({
      id: 'id',
      description: 'description',
      label: 'label',
      rules: [FieldRules.required],
      type: checkbox([
        option({ id: 'test', label: 'test', value: 'test' })
      ])
    })
  ]),
  metaToView: meta([
    metaItem({ label: 'Name', type: MetaToViewComponents.link })
  ])
})

// form([
//   field({
//     id: 'id',
//     description: 'description',
//     label: 'label',
//     rules: [FieldRules.required],
//     type: checkbox([
//       option({ id: 1, label: '', value: 1 })
//     ])
//   })
// ])