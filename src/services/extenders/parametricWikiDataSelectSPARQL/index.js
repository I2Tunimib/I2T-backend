import axios from 'axios';

const labelReturn = ' SERVICE wikibase:label { bd:serviceParam wikibase:language "en,nl" }';

// funzioni per ottere le options della select
function getElementCodeFromUrl(url) {
  const url_split = url.split('/');
  if (url_split[2] === 'www.wikidata.org') {
    return url_split[url_split.length - 1];
  }
  return undefined
}


async function getPropertyDict() {
  const select = "SELECT ?prop ?propLabel";
  const where = " WHERE { wd:Q515 wdt:P1963 ?prop. " + labelReturn + "} GROUP BY ?prop ?propLabel";
  let result = await axios.get(process.env.WD_SPARQL + encodeURIComponent(select + where));
  result = result.data.results.bindings;
  let propDict = []
  result.map((prop) => {
    let option = {}
    option["id"] = getElementCodeFromUrl(prop.prop.value);
    option["label"] = prop.propLabel.value;
    option["value"] = getElementCodeFromUrl(prop.prop.value);
    propDict.push(option);
  });
  return propDict;
}


//file di configurazione per il modulo
export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true
  },
  public: {
    name: 'Wikidata Select SPARQL',
    relativeUrl: '/wikidata/entities',
    description: "Extension service that is based on the Wikidata KG and allows you to select and extend the Wikidata property you want from those available..",
    formParams: [
      {
        id: 'prop',
        description: "Select <b>the Wikidata's property name</b>:",
        label: "Property Name",
        infoText: "To extend a new column, select on of the following properties.",
        inputType: 'select',
        rules: ['required'],
        options: await getPropertyDict()
      }
    ]
  }
}
