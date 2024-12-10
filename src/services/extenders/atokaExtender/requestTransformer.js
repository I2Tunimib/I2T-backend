import config from './index.js';
import axios from 'axios';

const { endpoint } = config.private;
const { access_token } = config.private;


async function makeRequest(endpoint, payload, row) {
  const res = await axios({
    method: 'get',
    url: endpoint,
    params: payload
  });
  res.data['row'] = row;
  return res.data;
}


function cleanId(id){
  return id.split(':')[1];
}

export default async (req) => {
  const { items } = req.original;
  const { props } = req.original;




  return Promise.all(Object.keys(items).map(async (data) => {
    return Promise.all(Object.keys(items[data]).map(async (row) => {
      let res = await makeRequest(endpoint + cleanId(items[data][row]), {'token': access_token }, row);
      return res;
    }));
  }));
}
