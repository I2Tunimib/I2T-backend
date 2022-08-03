import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const { access_token } = config.private;


function preparePayloadNew(row, token, limit) {
  let payload = { 'token': token, 'fuzziness': 2, 'fields': 'items', 'packages': 'base', 'limit': limit };
  Object.keys(row).forEach(field => {
    payload[field] = row[field];
  })
  return payload;
}

async function makeRequest(endpoint, payload, row, colName) {
  try{
    const res = await axios({
      method: 'get',
      url: endpoint,
      params: payload
    });
    res.data['row'] = row;
    res.data['colName'] = colName;
    return res.data;
  }catch(error){
    return {'row': row, 'colName': colName, 'items': []};
  }
  
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
  return { 'dict': dict, 'colName': colName };
}

function fixOptionalField(props, column, name) {
  if (props[name] !== undefined && props[column] !== undefined) {
    props[props[name]] = props[column]
    delete props[name];
    delete props[column];
  }
  return props
}

function cleanProps(props){
  delete props["atokaName"];
  delete props["atokaRegNumber"];
  delete props["atokaWebsitesDomains"];
  delete props["atokaPhones"];
  delete props["atokaEmails"];
  delete props["atokaSocials"];
  return props;
}


export default async (req) => {
  const { items } = req.original;
  let { props } = req.original;

  props = cleanProps(props);
  props = fixOptionalField(props, "opt1", "optField1");
  props = fixOptionalField(props, "opt2", "optField2");

  let dataRequest = prepareDict(items, props);
  const { colName } = dataRequest;
  dataRequest = dataRequest.dict;

  return Promise.all(Object.keys(dataRequest).map(async (data) => {
    const payload = preparePayloadNew(dataRequest[data], access_token, 10);
    let res = makeRequest(endpoint, payload, data, colName);
    return res;
  }))
}




