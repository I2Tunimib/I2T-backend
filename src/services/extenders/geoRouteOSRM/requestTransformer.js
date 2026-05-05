import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;

function cleanCoordinates(coordinates) {
  if (!coordinates) return undefined;
  const coordString = Array.isArray(coordinates) ? coordinates[0] : coordinates;
  const rawCoords = coordString.includes(':') ? coordString.split(':')[1] : coordString;
  const parts = rawCoords.split(",");
  if (parts.length !== 2) return undefined;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lon)) return undefined;
  // [Lon, Lat]
  return `${lon},${lat}`;
}

export default async (req) => {
  const { items, props } = req.original;
  const start = items[Object.keys(items)[0]];
  const endCol = props.end;

  let promises = [];
  let RowDict = {};
  let count = 0;

  for (const rowId of Object.keys(start)) {
    const origin = cleanCoordinates(start[rowId]);
    const rawDest = endCol[rowId]?.[1]?.[0]?.id || endCol[rowId];
    const destCoords = cleanCoordinates(rawDest);

    if (!origin || !destCoords) {
      throw new Error("Please provide a destination column already reconciled with coordinates or " +
        "containing raw coordinates");
    }

    if (origin && destCoords) {
      // URL OSRM: endpoint/long,lat;long,lat?overview=full
      const url = `${endpoint}${origin};${destCoords}?overview=full&geometries=polyline`;
      promises.push(axios.get(url).catch(e => ({ data: { code: 'Error' } })));
      RowDict[count] = rowId;
      count++;
    }
  }

  const results = await Promise.all(promises);

  return {
    data: results.map(r => r.data),
    dict: RowDict,
    start: Object.keys(items)[0],
    end: props.end[Object.keys(props.end)[0]][2],
  };
};
