import config from './index';
import axios from 'axios';

const {endpoint} = config.private;
const {access_token} = config.private;

function cleanCoordinates(coordinates){
  if(coordinates !== undefined){
    coordinates = coordinates.split(':')[1].split(',');
    return [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
  }
  return undefined;
}

function getLatLongStart(start_row){
  if(start_row !== undefined){
    return cleanCoordinates(start_row);
  }
  return undefined;
}

function getLatLongEnd(end_row){
  if(end_row[1][0] !== undefined){
    return cleanCoordinates(end_row[1][0].id);
  }
  return undefined;
}

function createRoute(start, end){
  if(start !== undefined && end !== undefined){
    return {"origin": start, 
  "destination": end}
  }
  return undefined;
}

export default async (req) => {


  let RouteList = []
  let RowDict = {}
  
  const {items} = req. original;
  const { props } = req.original;

  const start = items[Object.keys(items)[0]];
  const end = props.end;

  Object.keys(start).forEach(row => {
      let route = createRoute(getLatLongStart(start[row]), getLatLongEnd(end[row]));
      if(route !== undefined){
        RouteList.push(route);
        RowDict[row] = route;
      }
  })  
  const res = await axios.post(endpoint+"?&token="+ access_token, {'json': RouteList});
  
  return {'data': res.data, 'dict':RowDict, 'start': Object.keys(items)[0], end:props.end[Object.keys(props.end)[0]][2]};
}



