import config from './index';
import axios from 'axios';

const { endpoint, token } = config.private;


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

  console.log(items)


  const queries = {"cells": Object.keys(items).map(label => cleanLabel(label))}
  //const formBody = JSON.stringify(queries);
  //console.log(formBody)
  const response = await axios.post(endpoint + '?token=' + token + "&ngrams=True", queries)
  return response.data
}
