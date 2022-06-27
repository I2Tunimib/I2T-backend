import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const {access_token} = config.private;

function getAddressFormat(items){
  return {'address': items}
}

export default async (req) => {
  const addressList = [];
  const { items } = req.processed;
  Object.keys(items).forEach(item => {
    addressList.push(getAddressFormat(item));
  });

  const res = await axios.post(endpoint+"?token="+access_token, {'json': addressList});
  return res.data.result;
}




