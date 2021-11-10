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
  asiaGeo: async (req) => {
    const { items, property } = req;

    return Promise.all(Object.keys(items).map( async (colId) => {
      const columnItems = items[colId]
      const { ids, idsMap } = Object.keys(columnItems).reduce((acc, key) => {
        const id = columnItems[key].split(':')[1];
        acc.ids.push(id);
        acc.idsMap[id] = key
        return acc;
      }, { ids: [], idsMap: {} });
  
      const properties = property.map((prop) => ({ id: prop }));
      
      const params = stringify({
        extend: JSON.stringify({ ids, properties }),
        conciliator: 'geonames',
      })
  
      const res = await axios.post(`${CONFIG.ASIA_EXTENSION}/extend`, params);
  
      if (res.data) {
        const { data } = res;
        return {
          id: colId,
          data: processResponse(data, idsMap)
        };
      }
    }));

    // return {
    //   req,
    //   res: allResponses,
    //   idsMap
    // }

    // await ExtensionResponseTransformer.asiaGeo({
    //   req,
    //   res: allResponses,
    //   idsMap
    // })
  },
  asiaWeather: async ({ items, offsets, dates: datesInput, weatherParams: weatherParamsInput }) => {
    const res = await Promise.all(Object.keys(items).map( async (colId) => {
      const columnItems = items[colId];
      
      const { ids, idsMap } = Object.keys(columnItems).reduce((acc, key, index) => {
        const id = columnItems[key].split(':')[1];
        if (index === 0) {
          acc.ids += id
        } else {
          acc.ids += `,${id}`;
        }
        acc.idsMap[id] = key
        return acc;
      }, { ids: '', idsMap: {} });

      const dates = Object.keys(datesInput).map((key) => datesInput[key]).join(',');
      const weatherParams = weatherParamsInput.join(',');

      const params = stringify({
        ids,
        dates,
        offsets,
        weatherParams
      })
  
      const res = await axios.post(`${CONFIG.ASIA_EXTENSION}/weather`, params)
      return {
        id: colId,
        data: res.data
      };
    }));
    console.log(res);
  }
}

export default ExtensionService;
