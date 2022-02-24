import config from './index';
import axios from 'axios';
import { stringify } from 'qs';

const { endpoint } = config.private;


export default async (req) => {
  const { items, props } = req.processed;

  const { property } = props;

  return Promise.all(Object.keys(items).map(async (colId) => {

    const columnItems = items[colId];

    // id to query
    const ids = Object.keys(columnItems).map((metaId) => {
      const [prefix, id] = metaId.split(':');
      return id;
    });
    // selected admins properties
    const properties = property.map((prop) => ({ id: prop }));

    const params = stringify({
      extend: JSON.stringify({ ids, properties }),
      conciliator: 'geonames',
    })

    const res = await axios.post(`${endpoint}/extend`, params);

    return {
      res: res.data
    }
  }));
}