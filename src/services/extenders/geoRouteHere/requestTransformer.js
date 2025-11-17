import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const { access_token } = config.private;

function cleanCoordinates(coordinates) {
  if (coordinates !== undefined) {
    coordinates = coordinates.split(":")[1].split(",");
    return [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
  }
  return undefined;
}

function getLatLongStart(start_row) {
  if (start_row !== undefined) {
    return cleanCoordinates(start_row);
  }
  return undefined;
}

function getLatLongEnd(end_row, POI) {
  if (end_row[1][0] !== undefined && POI === false) {
    return cleanCoordinates(end_row[1][0].id);
  }
  if (end_row[0] !== undefined && POI === true) {
    return end_row[0];
  }
  return undefined;
}

function createRoute(start, end) {
  if (start !== undefined && end !== undefined) {
    return {
      origin: start,
      destination: end,
    };
  }
  return undefined;
}

export default async (req) => {
  let RouteList = [];
  let RowDict = {};

  const { items } = req.original;
  let { props } = req.original;
  let POI = false;

  // Check if props and poi_property exist
  if (
    props &&
    props["poi_property"] &&
    props["poi_property"].findIndex((element) => element === "poi") !== -1
  ) {
    POI = true;
  }

  const start = items[Object.keys(items)[0]];
  const end = props.end;

  Object.keys(start).forEach((row) => {
    let route = createRoute(
      getLatLongStart(start[row]),
      getLatLongEnd(end[row], POI),
    );
    if (route !== undefined) {
      RouteList.push(route);
      RowDict[RouteList.length - 1] = row;
    }
  });
  const payload = { json: RouteList };

  const res = await axios.post(endpoint + "?&token=" + access_token, payload);
  return {
    data: res.data,
    dict: RowDict,
    start: Object.keys(items)[0],
    end: props.end[Object.keys(props.end)[0]][2],
  };
};
