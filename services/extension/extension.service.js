import axios from 'axios';
import CONFIG from '../../config';
import { stringify } from 'qs';
import { KG_INFO } from '../../utils/constants';

const processResponse = (data, idsMap) => {
  const { meta, rows } = data;

  let context = {};

  const items = Object.keys(rows).reduce((accItems, key) => {
    const prop = rows[key]

    accItems[idsMap[key]] = Object.keys(prop).reduce((acc, keyProp) => {
      if (prop[keyProp].length > 0) {
        context['geo'] = {
          total: context['geo'] && context['geo'].total ? context['geo'].total + 1 : 1,
          reconciliated: context['geo'] && context['geo'].reconciliated  ? context['geo'].reconciliated + 1 : 1
        }
      }

      acc[keyProp] = prop[keyProp].map(({ id, ...rest }) => ({ id: `geo:${id}`, ...rest }))
      return acc;
    }, {})
    return accItems;
  }, {});

  context = Object.keys(context).reduce((acc, key) => {
    acc[key] = {
      ...context[key],
      uri: KG_INFO[key].uri
    }
    return acc;
  }, {});

  return {
    meta: { props: meta, context },
    items
  };

}

const ExtensionService = {
  asiaGeo: async ({ items, props }) => {
    const { ids, idsMap } = Object.keys(items).reduce((acc, key) => {
      acc.ids.push(items[key]);
      acc.idsMap[items[key]] = key
      return acc;
    }, { ids: [], idsMap: {} });

    const properties = props.map((prop) => ({ id: prop }));
    
    const params = stringify({
      extend: JSON.stringify({ ids, properties }),
      conciliator: 'geonames',
    })

    const res = await axios.post(`${CONFIG.ASIA_EXTENSION}/extend`, params);

    if (res.data) {
      const { data } = res;
      return processResponse(data, idsMap);
    }
  }
}

export default ExtensionService;