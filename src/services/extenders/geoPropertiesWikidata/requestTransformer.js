import config from './index.js';
import axios from 'axios';

const {endpoint} = config.private;

export default async (req) => {
  const { items } = req.processed;

  // for each column to extend
  return Promise.all(Object.keys(items).map(async (colId) => {
    const columnItems = items[colId];

    const ids = Object.keys(columnItems).reduce((acc, metaId) => {
      const [prefix, id] = metaId.split(':');
      if (prefix === 'wd') {
        acc.push(id);
      }
      return acc;
    }, []);

    const res = await axios.get(`${endpoint}${ids.join('|')}`);

    return {
      res: res.data
    }
  }));
}
