export default async (req, res) => {
  const inputColumns = Object.keys(req.processed.items);
  const decimalFormat = req.processed.props.decimalFormat; // "decimalFormat": ["comma"] or empty []

  let response = {
    columns: {},
    meta: {},
  };

  // result for each input column
  res.forEach((serviceResponse, colIndex) => {
    serviceResponse.forEach(({ rowId, weatherParams, data }) => {
      const weatherParameters = weatherParams.split(",");

      // API returned an error for this row (e.g. date out of range) – fill with null
      if (!data) {
        weatherParameters.forEach((param) => {
          const colId = `${inputColumns[colIndex]}_${param}`;
          if (!(colId in response.columns)) {
            response.columns[colId] = { label: colId, metadata: [], cells: {} };
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
        /*
        const columNames = { // to cahnge the default names of the new columns
          apparent_temperature_max: 'temperature_max',
          apparent_temperature_min: 'temperature_min',
        };
         */
        const colId = `${inputColumns[colIndex]}_${param}`;
        if (!(colId in response.columns)) {
          response.columns[colId] = {
            label: colId,
            metadata: [],
            cells: {},
          };
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
