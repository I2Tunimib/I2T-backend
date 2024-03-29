import config from './index';
import axios from 'axios';
import { stringify } from 'qs';
import fs from "fs";

const { endpoint } = config.private;

export default async (req) => {

  fs.writeFile('/Users/flaviodepaoli/fileSemTUI/requestEXT-asiaWeather.json', JSON.stringify(req), function (err) {
    if (err) throw err;
    console.log('File /Users/flaviodepaoli/fileSemTUI/requestEXT-asiaWeather.json saved!');
  });

  const { items, props } = req.processed;
  const { offsets, dates: datesInput, weatherParams: weatherParamsInput } = props;

  // process weather params
  const weatherParams = weatherParamsInput.join(',');

  // for each column to extend
  const allResponses = await Promise.all(Object.keys(items).map(async (colId) => {
    const columnItems = items[colId];

    let requests = [];

    Object.keys(columnItems).forEach((metaId) => {
      const [prefix, id] = metaId.split(':');

      columnItems[metaId].forEach((rowId) => {
        const date = datesInput[rowId];

        requests.push({ 
          ids: id,
          rowId,
          dates: date,
          offsets,
          weatherParams
        })
      });
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