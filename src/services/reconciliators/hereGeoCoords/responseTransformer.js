import config from './index';

const { uri } = config.public;

function getInformation(item) {
  return { "label": item.address.label, "lat": item.position.lat, "lng": item.position.lng, "score": item.scoring.queryScore, "name_eng": item.address.label }
}


function getDict(res) {
  let dict = {};
  res.forEach(item => {
    if (item.items[0] !== undefined) {
      dict[item.address] = getInformation(item.items[0]);
    }
  });
  return dict
}

function getMetaData(data) {
  return [{
    'id': String("georss:" + data.lat + "," + data.lng),
    'feature': [{ 'id': 'all_labels', 'value': 100 }],
    'name': data.name_eng,
    'score': data.score,
    'match': true,
    'type': [{ 'id': "wd:Q29934236", 'name': "GlobeCoordinate" },
    { 'id': "georss:point", 'name': "point" }]
  }]
}

function getColumnMetadata() {
  return [{
    'id': "wd:Q29934236",
    'name': "GlobeCoordinate",
    'score': 0,
    'match': true,
    'type': []
  },
  {
    'id': "georss:point",
    'name': "point",
    'score': 0,
    'match': true,
    'type':[]
  }]
}



export default async (req, res) => {
  const { items } = req.original;
  const response = [];

  if (items.length > 1) {
    let header = {}
    header.id = items[0].id;
    header.metadata = getColumnMetadata();
    delete (items[0]);
    response.push(header)
  }
  const dict = getDict(res.result);



  items.forEach(item => {
    let row = {};
    row.id = item.id;
    if (dict[res.labelDict[item.label]]) {
      row.metadata = getMetaData(dict[res.labelDict[item.label]]);
    } else {
      row.metadata = [];
    }
    response.push(row);
  });
  return response;
}