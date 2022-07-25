import config from './index';

const { uri } = config.public;


function getColumnMetadata() {
  return [{
    'id': "wd:Q7837941",
    'name': "company",
    'score': 1.0,
    'match': true,
    'type': []
  }]
}

export default async (req, res) => {
  console.log(res)
  

  let response = res.map(data => {
    let doc = {'id': data.row+'$'+data.colName};
    doc['metadata'] = data.items.map(item => {
      return {'id': 'atoka:'+item['id'],
      'name': item['base']['legalName'],
      'type': [{'id': 'wd:Q783794', 'name': 'company'}], 
      'score': item['confidence'],
      'match': false
      }
    });
    return doc;
  });

  let header = {}
  header.id = res[0].colName
  header.metadata = getColumnMetadata();
  response.push(header)


  return response;
}