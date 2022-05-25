import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const labelReturn = ' SERVICE wikibase:label { bd:serviceParam wikibase:language "en,nl" }';

function getElementCodeFromUrl(url) {
  const url_split = url.split('/');
  if(url_split[2] === 'www.wikidata.org'){
      return url_split[url_split.length - 1];
  }
  return undefined
}

async function getPropertyDict() {
  const select = "SELECT ?prop ?propLabel";
  const where = " WHERE { ?classi wdt:P1963 ?prop. " + labelReturn + "} GROUP BY ?prop ?propLabel";
  let result = await axios.get(endpoint + encodeURIComponent(select + where));
  result = result.data.results.bindings;
  let propDict = {}
  result.map((prop) => {
    const id = prop.prop.value;
    const label = prop.propLabel.value
    propDict[label] = getElementCodeFromUrl(id);
  });
  return propDict;
}

function getPropertyCode(label, dict) {
  console.log( dict[label])
  return dict[label]
}


//CREAZIONE CAMPI QUERY
function creaSelect(prope) {
  return prope.reduce(
    (previousValue, currentValue) => previousValue +" ?"+ currentValue+" ?" + currentValue +
      "Label ?values" + currentValue + " ?values" + currentValue + "Label ",
    "?values "
  );
}

function creaValues(ids) {
  return ids.reduce(
    (previousValue, currentValue) => previousValue + " wd:" + currentValue,
    "VALUES ?values {"
  ) + " } ";
}


function creaOptional(prope) {
  return prope.reduce(
    (previousValue, currentValue) => previousValue +
      "OPTIONAL{?values" + " wdt:" + currentValue + " ?values" + currentValue + "} ",
    "")
}

function creaWhere(ids, prope) {
  const values = creaValues(ids);
  return values + prope.reduce(
    (previousValue, currentValue) => previousValue + "?" + currentValue +
      " wikibase:directClaim wdt:" + currentValue + ". " + creaOptional(prope),
    ""
  );
}

function creaQuery(select, where) {
  return "SELECT " + select + " WHERE{ " + where +
    " " + labelReturn + "}";
}


export default async (req) => {
  const { items, props } = req.processed;
  let { prop } = props
  prop = prop.split(",");

  const propDict = await getPropertyDict();

  prop = prop.map((prope) => {
    return getPropertyCode(prope, propDict);
  });

  


  return Promise.all(Object.keys(items).map(async (colId) => {

    const columnItems = items[colId];

    const ids = Object.keys(columnItems).map((metaId) => {
      const [prefix, id] = metaId.split(':');
      return id;
    });


    let res = {};
    let select = creaSelect(prop);
    let where = creaWhere(ids, prop);
    let query = creaQuery(select, where);
    
    const result = await axios.get(endpoint + encodeURIComponent(query));
    res = result.data.results.bindings;
    res.push({'prop' : prop})
    return res;
  }));
}