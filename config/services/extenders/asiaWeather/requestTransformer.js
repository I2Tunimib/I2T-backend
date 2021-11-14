import config from './index';
import axios from 'axios';
import { stringify } from 'qs';

const { endpoint } = config.private;

export default async (req) => {
  const { items, offsets, dates: datesInput, weatherParams: weatherParamsInput } = req;
  // process weather params
  const weatherParams = weatherParamsInput.join(',');
  // for each column to extend
  const allResponses = await Promise.all(Object.keys(items).map(async (colId) => {
    const columnItems = items[colId];

    const requests = Object.keys(columnItems).map((rowId) => {
      const id = columnItems[rowId].split(':')[1];
      const date = datesInput[rowId];

      return {
        ids: id,
        rowId,
        dates: date,
        offsets,
        weatherParams
      }
    });

    return Promise.all(requests.map(async ({ ids, rowId, ...rest }) => {
      const res = await axios.post(`${endpoint}/weather`, stringify({ ids, ...rest }));
      return {
        id: ids,
        rowId,
        data: res.data
      }
    }))
  }));

  return allResponses;
}