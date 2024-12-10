import config from './index.js';
import axios from 'axios';

const { endpoint } = config.private;


function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function cleanLabel(label){
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, '');
}

export default async (req) => {
  // const { items } = req;
  // const queries = items.reduce((acc, { id, label }) => ({
  //   ...acc,
  //   [id]: { query: encodeURIComponent(label || '') }
  // }), {})

  const { items } = req.processed;

 // console.log(JSON.stringify(items));


  const queries = Object.keys(items).reduce((acc, label) => ({
    ...acc,
    [cleanLabel(label)]: { query: cleanLabel(label) }

  }), {});

  const formBody = 'queries=' + JSON.stringify(queries);
  const response = await axios.post(endpoint, formBody)
  return response.data
}
