import config from './index';
import axios from 'axios';
import { stringify } from 'qs';

const { endpoint } = config.private;

export default async (req) => {
  const { items, property } = req;

  return Promise.all(Object.keys(items).map(async (colId) => {
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

    const res = await axios.post(`${endpoint}/extend`, params);

    return {
      res: res.data,
      idsMap
    }
  }));
}