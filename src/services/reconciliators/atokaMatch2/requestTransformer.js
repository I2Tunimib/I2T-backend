import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const { access_token } = config.private;


function preparePayloadNew(row, token, limit) {
  let payload = { 'token': token, 'fuzziness': 0, 'active': '*', 'fields': 'items', 'limit': limit };
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

function prepareDict(itemProp, items, relevantFilters, optionalFilters){
  let dict = {}
  let colName = ""
  let type = ""
  items.forEach(item => {
    let splitted = item.id.split('$');
    if (splitted[1] !== undefined) {
      colName = splitted[1]
      dict[splitted[0]] = {}
      dict[splitted[0]][itemProp] = item.label
    }
    relevantFilters.forEach(relevantFilter=>{
      type = relevantFilter.type
      if(relevantFilter["column"][splitted[0]] !== undefined){
        dict[splitted[0]][type] = relevantFilter["column"][splitted[0]][0]
      }
    })
    optionalFilters.forEach(optionalFilter=>{
      type = optionalFilter.type
      if(optionalFilter["column"][splitted[0]] !== undefined){
        dict[splitted[0]][type] = optionalFilter["column"][splitted[0]][0]
      }
    })
  })
  return { 'dict': dict, 'colName': colName };
}


export default async (req) => {
  const items = req.original['props']['data']['items'];
  


  const firstRelevantProp = req.original['props']['data']['firstFilter']['type'];
  let relevantFilters = req.original['props']['data']['relevantFilter']
  let optionalFilters = req.original['props']['data']['optionalFilter']
  
  
 

  let dataRequest = prepareDict(firstRelevantProp, items, relevantFilters, optionalFilters);
  const { colName } = dataRequest;
  dataRequest = dataRequest.dict;
  

  return Promise.all(Object.keys(dataRequest).map(async (data) => {
    const payload = preparePayloadNew(dataRequest[data], access_token, 10);
    let res = makeRequest(endpoint, payload, data, colName);
    return res;
  }))
}




