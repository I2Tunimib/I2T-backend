export default async (req, res) => {
  const inputColumns = Object.keys(req.processed.items);
  const decimalFormat = req.processed.props.decimalFormat; // "decimalFormat": ["comma"] or empty []
  const { props } = req.processed;
  const dateColId = props.dates[Object.keys(props.dates)[0]][2];
  const sourceColId = inputColumns[0];

  let response = {
    columns: {},
    meta: {},
    originalColMeta: {
      originalColName: sourceColId,
      types: [],
      properties: []
    }
  };

  const metaMapping = {
    daylight_duration:
      {
        propId: "wd:P2047",
        label: "duration",
        typeId: "wd:Q11574",
        typeName: "second"
      },
    sunrise: {
      propId: "wd:P2047",
      label: "duration",
      typeId: "wd:Q18640029",
      typeName: "ISO 8601"
    },
    sunset: {
      propId: "wd:P2047",
      label: "duration",
      typeId: "wd:Q18640029",
      typeName: "ISO 8601"
    },
    temperature_max:
      {
        propId: "wd:P6591",
        label: "maximum temperature record",
        typeId: "wd:Q11567",
        typeName: "degree Celsius"
      },
    temperature_min:
      {
        propId: "wd:P7422",
        label: "minimum temperature record",
        typeId: "wd:Q11567",
        typeName: "degree Celsius"
      },
    precipitation_sum:
      {
        propId: "wd:P3036",
        label: "precipitation",
        typeId: "wd:Q174789",
        typeName: "millimetre"
      },
    precipitation_hours:
      {
        propId: "wd:P2047",
        label: "duration",
        typeId: "wd:Q11573",
        typeName: "hour"
      },
    temperature_2m:
      {
        propId: "wd:P2076",
        label: "temperature",
        typeId: "wd:Q11567",
        typeName: "degree Celsius"
      },
    relative_humidity_2m:
      {
        propId: "wd:P5596",
        label: "relative humidity",
        typeId: "wd:Q11229",
        typeName: "percent"
      },
    precipitation:
      {
        propId: "wd:P3036",
        label: "precipitation",
        typeId: "wd:Q174789",
        typeName: "millimetre"
      },
  };

  response.originalColMeta.types.push({
    id: "wd:Q2221906",
    name: "geographic location",
    match: true,
    score: 100
  });

  response.originalColMeta.properties.push({
    id: "wd:P585",
    obj: dateColId,
    name: "point in time",
    match: true,
    score: 100
  });

  // result for each input column
  res.forEach((serviceResponse, colIndex) => {
    serviceResponse.forEach(({ rowId, weatherParams, data }) => {
      const weatherParameters = weatherParams.split(",");

      // API returned an error for this row (e.g. date out of range) – fill with null
      if (!data) {
        weatherParameters.forEach((param) => {
          const columNames = {
            apparent_temperature_max: 'temperature_max',
            apparent_temperature_min: 'temperature_min',
          };
          const displayName = columNames[param] || param;
          const colId = `${inputColumns[colIndex]}_${displayName}`;
          if (!(colId in response.columns)) {
            response.columns[colId] = {
              label: colId,
              kind: "literal",
              datatype: param === "sunrise" || param === "sunset" ? "DATE" : "NUMBER",
              metadata: [],
              cells: {}
            };
          }
          response.meta[colId] = inputColumns[colIndex];
          response.columns[colId].cells[rowId] = { label: null, metadata: [] };
        });
        return;
      }

      const source = data.daily || data.hourly; // Use the available one
      //console.log("source", source);

      weatherParameters.forEach((param) => {
        // for each item in weatherParameters build a column
        const columNames = { // to cahnge the default names of the new columns
          apparent_temperature_max: 'temperature_max',
          apparent_temperature_min: 'temperature_min',
        };
        const displayName = columNames[param] || param;
        const colId = `${inputColumns[colIndex]}_${displayName}`;
        if (!(colId in response.columns)) {
          response.columns[colId] = {
            label: colId,
            kind: "literal",
            datatype: param === "sunrise" || param === "sunset" ? "DATE" : "NUMBER",
            metadata: [],
            cells: {},
          };

          const metaInfo = metaMapping[displayName];
          if (metaInfo) {
            response.originalColMeta.properties.push({
              id: metaInfo.propId,
              obj: colId,
              name: metaInfo.label,
              match: true,
              score: 100
            });

            response.columns[colId].metadata = [{
              id: "weather_" + displayName,
              name: displayName,
              entity: [],
              type: [{
                id: metaInfo.typeId,
                name: metaInfo.typeName,
                match: true,
                score: 100
              }],
              property: []
            }];
          }
        }
        response.meta[colId] = inputColumns[colIndex];
        // add column cells
        let fixedValue = source[param][0];
        //console.log("fixedValue", fixedValue);
        if (decimalFormat[0] === "comma" && typeof fixedValue === "number") {
          fixedValue = fixedValue.toString().replace(".", ",");
        }

        response.columns[colId].cells = {
          ...response.columns[colId].cells,
          [rowId]: {
            label: fixedValue || "0",
            metadata: [],
          },
        };
      });
    });
  });
  return response;
};
