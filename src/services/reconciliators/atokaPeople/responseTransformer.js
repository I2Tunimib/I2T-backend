import config from './index';

const { uri } = config.public;
const {min_threshold} = config.private;


function getColumnMetadata() {
  return [{
    'id': "wd:Q215627",
    'name': "person",
    'score': 1.0,
    'match': true,
    'type': []
  }]
}

export default async (req, res) => {
  console.log(res)
  let response = res.map(data => {
    let doc = { 'id': data.row + '$' + data.colName };
    if (data.items.length == 0) {
      doc['metadata'] = [];
    } else {
      let first = true;
      doc['metadata'] = data.items.map(item => {
        if (item.confidence < min_threshold || first === false) {
          return {
            'id': 'atokaPeople:' + item['id'],
            'name': item['name'],
            'type': [{ 'id': 'wd:Q215627', 'name': 'person' }],
            'score': item['confidence'],
            'match': false
          }
        } else {
          first = false;
          return {
            'id': 'atokaPeople:' + item['id'],
            'name': item['name'],
            'type': [{ 'id': 'wd:Q215627', 'name': 'person' }],
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