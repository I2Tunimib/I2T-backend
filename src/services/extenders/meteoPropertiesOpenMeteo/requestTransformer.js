import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const allowedPrefixes = ["geoCoord", "georss", "geo"];

/**
 * Parse and convert date from various formats to ISO 8601 (YYYY-MM-DD)
 * Supports: DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
 */
const parseAndFormatDate = (dateStr) => {
  // Remove any whitespace
  dateStr = dateStr.trim();

  // Check if already in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse DD/MM/YY or DD/MM/YYYY format
  const ddmmyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const match = dateStr.match(ddmmyyPattern);

  if (match) {
    let [, day, month, year] = match;

    // Pad day and month with leading zeros if needed
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");

    // Handle 2-digit years (assuming 2000s for years < 50, 1900s otherwise)
    if (year.length === 2) {
      const yearNum = parseInt(year, 10);
      year = yearNum < 50 ? `20${year}` : `19${year}`;
    }

    return `${year}-${month}-${day}`;
  }

  // If we can't parse it, throw an error with a helpful message
  throw new Error(
    `Unable to parse date "${dateStr}". Expected format: YYYY-MM-DD or DD/MM/YY or DD/MM/YYYY`,
  );
};

export default async (req) => {
  const { items, props } = req.processed;
  const { dates: datesInput, granularity } = props;

  // Riconosce quale gruppo di parametri è stato usato
  const weatherParamsInput =
    granularity === "hourly"
      ? props.weatherParams_hourly
      : props.weatherParams_daily;

  let weatherParams = weatherParamsInput.join(",");
  if (weatherParams.includes("light_hours")) {
    // Replace 'light_hours' with 'sunset,sunrise'
    weatherParams = weatherParams.replace("light_hours", "sunset,sunrise");
  }
  console.log("params", weatherParams);
  console.log("items", items);
  console.log("props", props);
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

        // Parse and convert date to ISO format
        try {
          date = parseAndFormatDate(date);
        } catch (parseError) {
          throw new Error(
            `Error parsing date for row ${rowId}: ${parseError.message}`,
          );
        }

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
            throw new Error(
              "Invalid column for hourly params. Please select a column that includes the time " +
                "or switch to daily granularity.",
            );
          }
          // Hourly params selected and column datetime
          if (granularity === "hourly" && isDateTime && data.hourly) {
            const targetHour = date.slice(0, 13); // es. 2023-01-01T15
            const idx = data.hourly.time.findIndex((t) =>
              t.startsWith(targetHour),
            );
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
