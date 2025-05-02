import config from "./index.js";
import axios from "axios";
import { stringify } from "qs";
import fs from "fs";

const { endpoint } = config.private;
const allowedPrefixes = ["geoCoord", "georss", "geo"];
export default async (req) => {
  // fs.writeFile('../../fileSemTUI/requestEXT-UI-meteo.json', JSON.stringify(req), function (err) {
  //     if (err) throw err;
  //     console.log('File ../../fileSemTUI/requestEXT-UI-meteo.json saved!');
  // });
  //    console.log(`*** endpoint: ${endpoint}`);

  const { items, props } = req.processed;
  const { dates: datesInput, weatherParams: weatherParamsInput } = props;

  // process weather params
  let weatherParams = weatherParamsInput.join(",");
  // console.log(`*** weather params: ${weatherParams}`); // apparent_temperature_max,apparent_temperature_min
  if (weatherParams.includes("light_hours")) {
    // Replace 'light_hours' with 'sunset,sunrise'
    weatherParams = weatherParams.replace("light_hours", "sunset,sunrise");
  }

  // for each column to extend
  const allResponses = await Promise.all(
    Object.keys(items).map(async (colId) => {
      const columnItems = items[colId];
      //        console.log(`*** columnItems: ${JSON.stringify(columnItems)}`); // {"georss:52.51604,13.37691":["r0","r1"], }

      let requests = [];
      Object.keys(columnItems).forEach((metaId) => {
        const [prefix, coord] = metaId.split(":");
        const [lat, lon] = coord.split(",");
        if (!allowedPrefixes.includes(prefix)) {
          //skip if not geographic coordinates
          return;
        }
        //console.log(`*** prefix: ${prefix} - coord: ${coord} - lat: ${lat} - lon: ${lon}`);

        columnItems[metaId].forEach((rowId) => {
          const date = datesInput[rowId][0];
          //console.log(`*** date: ${date}`);

          requests.push({
            ids: coord,
            lat: lat,
            lon: lon,
            rowId,
            dates: date,
            weatherParams,
          });
        });
      });
      const allResponses = [];

      for (const colId of Object.keys(items)) {
        const columnItems = items[colId];
        let requests = [];

        Object.keys(columnItems).forEach((metaId) => {
          const [prefix, coord] = metaId.split(":");
          if (!allowedPrefixes.includes(prefix)) {
            //skip if not geographic coordinates
            return;
          }
          const [lat, lon] = coord.split(",");

          columnItems[metaId].forEach((rowId) => {
            const date = datesInput[rowId][0];
            requests.push({
              ids: coord,
              lat: lat,
              lon: lon,
              rowId,
              dates: date,
              weatherParams,
            });
          });
        });

        for (const { ids, lat, lon, rowId, dates, ...rest } of requests) {
          const url = `${endpoint}latitude=${lat}&longitude=${lon}&start_date=${dates}&end_date=${dates}&daily=${weatherParams}&timezone=Europe/Rome`;
          // console.log(`*** request: ${url}`);
          const res = await axios.get(url);
          allResponses.push({
            id: ids,
            rowId,
            weatherParams,
            data: res.data,
          });
        }
      }

      return allResponses;
      return Promise.all(
        requests.map(async ({ ids, lat, lon, rowId, dates, ...rest }) => {
          // const res = await axios.post(`${endpoint}/weather`, stringify({ ids, ...rest }));
          const url = `${endpoint}latitude=${lat}&longitude=${lon}&start_date=${dates}&end_date=${dates}&daily=${weatherParams}&timezone=Europe/Rome`;
          //            console.log(`*** request: ${url}`);
          const res = await axios.get(url);
          return {
            id: ids,
            rowId,
            weatherParams,
            data: res.data,
          };
        })
      );
    })
  );

  return allResponses;
};
