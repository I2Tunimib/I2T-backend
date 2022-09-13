import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const {access_token} = config.private;

function getAddressFormat(items){
  return {'address': items}
}

export default async (req) => {
  const addressList = [];
  const labelDict = {};
  
  const { items } = req.processed;
  Object.keys(items).forEach(item => {
    let indice = req.processed.items[item][0].split('$')[0];
    let newItem = item;
    if(req.original.props.secondPart !== undefined && req.original.props.secondPart[indice] !== undefined){
      newItem = newItem + " " + req.original.props.secondPart[indice][0];
    }
    if(req.original.props.thirdPart !== undefined && req.original.props.thirdPart[indice] !== undefined){
      newItem = newItem + " " + req.original.props.thirdPart[indice][0];
    }
    labelDict[item] = newItem;
    addressList.push(getAddressFormat(newItem));
  });
  const res = await axios.post(endpoint+"?token="+access_token, {'json': addressList});
  return {
    'result': res.data.result,
    'labelDict': labelDict
  }
}




