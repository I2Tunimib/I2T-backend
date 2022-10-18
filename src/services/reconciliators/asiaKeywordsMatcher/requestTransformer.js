import config from './index';
import axios from 'axios';

const { endpoint } = config.private;

export default async (req) => {
  const { items } = req.processed;

  const queries = Object.keys(items).reduce((acc, label) => ({
    ...acc,
    [label]: { query: encodeURIComponent(label || '') }
  }), {});

  const formBody = 'queries=' + JSON.stringify(queries);
  const response = await axios.post(`${endpoint}/keywordsmatcher`, formBody)

  return response.data;
}