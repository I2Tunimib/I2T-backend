export default async (req, res) => {
  const inputColumns = Object.keys(req.processed.items);

  let response = {
    columns: {},
    meta: {}
  }

  // result for each input column
  res.forEach((serviceResponse, colIndex) => {
//    console.log(`\n *** serviceResponse: ${JSON.stringify(serviceResponse)} \n --- colIndex: ${colIndex}`);
    serviceResponse.forEach(({ rowId, weatherParams, data }) => {
      const weatherParameters = weatherParams.split(',')
//      console.log(`\n *** rowId: ${rowId} \n --- weatherParameters: ${weatherParameters} \n --- data: ${JSON.stringify(data)}`);

      if (weatherParameters) {
        // for each combination offest_weatherParam build a column
        weatherParameters.forEach((param) => {
          // for each item in weatherParameters build a column
          const colId = `${inputColumns[colIndex]}_${param}`;
//          console.log(`***  param: ${param} --- daily: ${JSON.stringify(data.daily[param])} --- colId: ${colId}`);
          if (!(colId in response.columns)) {
            response.columns[colId] = {
              label: colId,
              metadata: [],
              cells: {}
            }
          }
          response.meta[colId] = inputColumns[colIndex];
          // add column cells
          let fixedValue = data.daily[param];
          fixedValue = fixedValue.toString().replace('.',',');
          response.columns[colId].cells = {
            ...response.columns[colId].cells,
            [rowId]: { // we may check if data.daily[param] is a valid value
              label: fixedValue,
              metadata: []
            }
          }
        });
      }
    });
  });

  return response;
}