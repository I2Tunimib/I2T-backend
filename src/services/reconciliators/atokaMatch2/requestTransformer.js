import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const { access_token } = config.private;


function preparePayload(name, regNumber, websitesDomain, phone, email, social, token, limit) {
  let payload = { 'token': token, 'fuzziness': 2, 'fields': 'items', 'packages': 'base', 'limit': limit };
  if (name !== "") { payload["name"] = name; }
  if (regNumber !== "") { payload["regNumbers"] = regNumber; }
  if (websitesDomain !== "") { payload["websitesDomains"] = websitesDomain; }
  if (phone !== "") { payload["phones"] = phone; }
  if (email !== "") { payload["emails"] = email; }
  if (social !== "") { payload["socials"] = social; }
  return payload;
}

async function makeRequest(endpoint, payload, row, colName) {
  const res = await axios({
    method: 'get',
    url: endpoint,
    params: payload
  });
  res.data['row'] = row;
  res.data['colName'] = colName;
  return res.data;
}

function prepareDict(items, props) {
  let dict = {};
  let colName = "";
  items.forEach(item => {
    let splitted = item.id.split('$');
    if (splitted[1] !== undefined) {
      colName = splitted[1];
      dict[splitted[0]] = { 'name': item.label }
      Object.keys(props).forEach(prop => {
        dict[splitted[0]][prop] = props[prop][item.id.split('$')[0]][0];
      })
    }
  });
  return {'dict': dict, 'colName': colName};
}


export default async (req) => {
  const { items } = req.original;
  const { props } = req.original;
  



  let dataRequest = prepareDict(items, props);

  const {colName} = dataRequest;
  dataRequest = dataRequest.dict;

  return Promise.all(Object.keys(dataRequest).map(async (data) => {
    let payload = preparePayload(dataRequest[data].name, dataRequest[data].regNumber, dataRequest[data].websitesDomains, dataRequest[data].phones, dataRequest[data].emails, "", access_token, 2);
    console.log(payload);
    let res = makeRequest(endpoint, payload, data, colName);
    return res;
  }))
}




