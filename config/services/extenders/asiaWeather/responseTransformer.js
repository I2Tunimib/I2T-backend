export default async (req, res) => {
  const { items } = req;
  const inputColumnsLabels = Object.keys(items);

  let response = {
    columns: {},
    rows: {},
    meta: {}
  }

  // result for each input column
  res.forEach((serviceResponse, colIndex) => {
    serviceResponse.forEach(({ rowId, data }) => {
      data.forEach(({ weatherParameters, offset }) => {
        if (weatherParameters) {
          // for each combination offest_weatherParam build a column
          weatherParameters.forEach(({ id, ...rest }) => {
            // for each item in weatherParameters build a column
            const colId = `${inputColumnsLabels[colIndex]}_offset${offset}_${id}`;
            response.columns[colId] = {
              id: colId,
              label: colId,
              metadata: []
            }
            response.meta[colId] = inputColumnsLabels[colIndex];

            const cellId = `${rowId}$${colId}`;
            response.rows[rowId] = {
              ...response.rows[rowId],
              id: rowId,
              cells: {
                ...(response.rows[rowId] && { ...response.rows[rowId].cells }),
                [colId]: {
                  id: cellId,
                  label: id === 'sund' ? rest.cumulValue : rest.avgValue,
                  metadata: []
                }
              }
            }
          });
        }
      });
    });
  });

  return response;
}