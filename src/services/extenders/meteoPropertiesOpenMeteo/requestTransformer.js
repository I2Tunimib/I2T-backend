import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const allowedPrefixes = ["geoCoord", "georss", "geo"];
export default async (req) => {
  // fs.writeFile('../../fileSemTUI/requestEXT-UI-meteo.json', JSON.stringify(req), function (err) {
  //     if (err) throw err;
  //     console.log('File ../../fileSemTUI/requestEXT-UI-meteo.json saved!');
  // });
  //    console.log(`*** endpoint: ${endpoint}`);

  const { items, props } = req.processed;
  const { dates: datesInput, granularity } = props;

  // Riconosce quale gruppo di parametri è stato usato
  const weatherParamsInput = granularity === "hourly"
    ? props.weatherParams_hourly
    : props.weatherParams_daily;

  let weatherParams = weatherParamsInput.join(",");
  //console.log("weatherParams", weatherParams);
  if (weatherParams.includes("light_hours")) {
    // Replace 'light_hours' with 'sunset,sunrise'
    weatherParams = weatherParams.replace("light_hours", "sunset,sunrise");
  }

  const allResponses = [];

  for (const colId of Object.keys(items)) {
    const columnItems = items[colId];

    for (const metaId of Object.keys(columnItems)) {
      const [prefix, coord] = metaId.split(":");
      if (!allowedPrefixes.includes(prefix)) {
        //skip if not geographic coordinates
        return;
      }
      const [lat, lon] = coord.split(",");

      for (const rowId of columnItems[metaId]) {
        let date = datesInput[rowId][0];
        let baseDate = date;
        let isDateTime = false;
        // Check if datetime
        if (date.includes("T")) {
          isDateTime = true;
          baseDate = date.split("T")[0];
        }

        let url;
        if (granularity === "daily") {
          url = `${endpoint}latitude=${lat}&longitude=${lon}&start_date=${baseDate}&end_date=${baseDate}&daily=${weatherParams}&timezone=Europe/Rome`;
          //console.log("daily params url", url);
        } else if (granularity === "hourly") {
          // Use a 24-hour interval centered on the selected day
          url = `${endpoint}latitude=${lat}&longitude=${lon}&start_date=${baseDate}&end_date=${baseDate}&hourly=${weatherParams}&timezone=Europe/Rome`;
          //console.log("hourly url", url);
        }
        try {
          const res = await axios.get(url);
          //console.log("res", res);
          const data = res.data;
          //console.log("data", data);
          // Hourly params selected and column only dates
          if (granularity === "hourly" && !isDateTime) {
            throw new Error('Invalid column for hourly params. Please select a column that includes the time ' +
              'or switch to daily granularity.');
          }
          // Hourly params selected and column datetime
          if (granularity === "hourly" && isDateTime && data.hourly) {
            const targetHour = date.slice(0, 13); // es. 2023-01-01T15
            const idx = data.hourly.time.findIndex((t) => t.startsWith(targetHour));
            //console.log("idx", idx);
            // Find index of the entry in the hourly data that matches the target hour
            if (idx !== -1) {
              // Keep only the value corresponding to the requested hour
              for (const param of weatherParamsInput) {
                if (data.hourly[param])
                  data.hourly[param] = [data.hourly[param][idx]];
              }
              data.hourly.time = [data.hourly.time[idx]];
              //console.log("data.hourly.time", data.hourly.time);
            } else {
              throw new Error(`No data found for ${date}`);
            }
          }

          allResponses.push({
            id: coord,
            rowId,
            weatherParams,
            data,
          });
        } catch (err) {
          throw new Error(err.message);
        }
      }
    }
  }
  return [allResponses];
};
