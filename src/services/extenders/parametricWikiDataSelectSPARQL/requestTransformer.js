import config from './index';
import axios from 'axios';

const { endpoint } = config.private;
const labelReturn = ' SERVICE wikibase:label { bd:serviceParam wikibase:language "en,nl" }';

//CREAZIONE CAMPI QUERY
function creaSelect(prope) {
  return [prope].reduce(
    (previousValue, currentValue) => previousValue + " ?" + currentValue + " ?" + currentValue +
      "Label ?values" + currentValue + " ?values" + currentValue + "Label ?instance"+currentValue+" ?instance"+currentValue+"Label",
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
  return [prope].reduce(
    (previousValue, currentValue) => previousValue +
      "OPTIONAL{?values" + " wdt:" + currentValue + " ?values" + currentValue +".} OPTIONAL{?values" + " wdt:" + currentValue + " ?values" + currentValue +"_. ?values"+currentValue+"_ wdt:P31 ?instance"+currentValue+".}",
    "")
}

function creaWhere(ids, prope) {
  const values = creaValues(ids);
  return values + [prope].reduce(
    (previousValue, currentValue) => previousValue + "?" + currentValue +
      " wikibase:directClaim wdt:" + currentValue + ". " + creaOptional(prope),
    ""
  );
}

function creaQuery(select, where) {
  return "SELECT " + select + " WHERE{ " + where +
    " " + labelReturn + "}";
}


//EFFETTUO LA RICHIESTA
export default async (req) => {
  const { items, props } = req.processed;
  let { prop } = props

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
    res.push({ 'prop': prop })
    return res;
  }));
}