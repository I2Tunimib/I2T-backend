import config from './index';
import axios from 'axios';

const { endpoint } = config.private;

function cleanLabel(label) {
  return label.replace(/&/g, '').replace(/\s*/g, ' ')
}

export default async (req) => {
  // const { items } = req;
  // const queries = items.reduce((acc, { id, label }) => ({
  //   ...acc,
  //   [id]: { query: encodeURIComponent(label || '') }
  // }), {})

  const { items } = req.processed;

  const queries = Object.keys(items).reduce((acc, label) => ({
    ...acc,
    [cleanLabel(label)]: { query: cleanLabel(label) }
  }), {});

  const formBody = 'queries=' + JSON.stringify(queries);
  const response = await axios.post(endpoint, formBody)
  return response.data
}