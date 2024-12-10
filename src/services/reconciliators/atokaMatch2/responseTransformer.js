import config from './index.js';

const { uri } = config.public;
const {min_threshold} = config.private;


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
  let response = res.map(data => {
    let doc = { 'id': data.row + '$' + data.colName };
    if (data.items.length == 0) {
      doc['metadata'] = [];
    } else {
      let first = true;
      let yellow = false;
      if(data.items.length > 1){
        if(data.items[1]['confidence'] >min_threshold){
          yellow = true;
        }
      }
      doc['metadata'] = data.items.map(item => {
        if (item.confidence < min_threshold || first === false || yellow === true) {
          return {
            'id': 'atoka:' + item['id'],
            'name': item['name'],
            'type': [{ 'id': 'wd:Q783794', 'name': 'company' }],
            'score': item['confidence'],
            'match': false
          }
        } else {
          first = false;
          return {
            'id': 'atoka:' + item['id'],
            'name': item['name'],
            'type': [{ 'id': 'wd:Q783794', 'name': 'company' }],
            'score': item['confidence'],
            'match': true
          }
        }
      });
    }
    return doc;
  });

  let header = {}
  header.id = res[0].colName
  header.metadata = getColumnMetadata();
  response.push(header)


  return response;
}
