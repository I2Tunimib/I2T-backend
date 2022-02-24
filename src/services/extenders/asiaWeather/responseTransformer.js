export default async (req, res) => {
  const inputColumns = Object.keys(req.processed.items);

  let response = {
    columns: {},
    meta: {}
  }

  // result for each input column
  res.forEach((serviceResponse, colIndex) => {
    serviceResponse.forEach(({ rowId, data }) => {
      data.forEach(({ geonamesId, weatherParameters, offset }) => {
        if (weatherParameters) {
          // for each combination offest_weatherParam build a column
          weatherParameters.forEach(({ id, ...rest }) => {
            // for each item in weatherParameters build a column
            const colId = `${inputColumns[colIndex]}_offset${offset}_${id}`;
            if (!(colId in response.columns)) {
              response.columns[colId] = {
                label: colId,
                metadata: [],
                cells: {}
              }
            }

            response.meta[colId] = inputColumns[colIndex];
            // add column cells
            response.columns[colId].cells = {
              ...response.columns[colId].cells,
              [rowId]: data.length > 0 ?{
                label: id === 'sund' ? rest.cumulValue : rest.avgValue,
                metadata: []
              } : null
            }
          });
        }
      });
    });
  });

  return response;
}