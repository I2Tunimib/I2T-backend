import config from './index';
import axios from 'axios';

const { endpoint } = config.private;

function getAddressFormat(items){
  return {'address': items}
}

export default async (req) => {
  const addressList = [];
  const { items } = req.processed;
  Object.keys(items).forEach(item => {
    addressList.push(getAddressFormat(item));
  });

  const res = await axios.post(endpoint, {'json': addressList});
  return res.data.result;
}




