import config from './index';

const { uri } = config.public;


export default async (req, res) => {

  let response = res.map(data => {
    let doc = {'id': data.row+'$'+data.colName};
    doc['metadata'] = data.items.map(item => {
      return {'id': 'atoka:'+item['id'],
      'name': item['base']['legalName'],
      'type': [], 
      'score': item['confidence'],
      'match': false
      }
    });
    return doc;
  });

  return response;
}