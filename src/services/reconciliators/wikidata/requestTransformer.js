import config from './index';
import axios from 'axios';

const { endpoint } = config.private;


export default async (req) => {
  // const { items } = req;
  // const queries = items.reduce((acc, { id, label }) => ({
  //   ...acc,
  //   [id]: { query: encodeURIComponent(label || '') }
  // }), {})

  const { items } = req.processed;


  const queries = Object.keys(items).reduce((acc, label) => ({
    ...acc,
    [label]: { query: label }

  }), {});

  const formBody = 'queries=' + JSON.stringify(queries);
  const response = await axios.post(endpoint, formBody)
  return response.data
}
