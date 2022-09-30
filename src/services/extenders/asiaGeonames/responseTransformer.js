const getMetadata = (metaRaw) => {
  return metaRaw.map(({ id, name }) => ({
    id: `geo:${id}`,
    name,
    score: 100,
    match: true
  }))
}

export default async (req, res) => {
  const { items } = req.processed;
  const inputColumns = Object.keys(items);

  let response = {
    columns: {},
    meta: {}
  }
  
  // each input column generated a response from the external service
  res.forEach((serviceResponse, colIndex) => {
    const { meta, rows } = serviceResponse.res;

    meta.forEach((property) => {
      const { id: propId } = property;
      const colId = `${inputColumns[colIndex]}_${propId}`;
      // create columns
      response.columns[colId] = {
        label: colId,
        metadata: [],
        cells: {}
      }
      // add columns mapping
      response.meta = {
        ...response.meta,
        [colId]: inputColumns[colIndex]
      }

      // add cells to each column
      Object.keys(rows).forEach((metadataId) => {
        // get rows for each metaId
        const requestRowsIds = items[inputColumns[colIndex]][`geo:${metadataId}`];

        // build cells
        const cells = requestRowsIds.reduce((acc, rowId) => {
          const cellMetadata = getMetadata(rows[metadataId][property.id]);

          acc[rowId] = cellMetadata && cellMetadata.length > 0 ? {
            label: cellMetadata[0].name,
            metadata: cellMetadata
          } : null;
          return acc;
        }, {});

        // add cells to column
        response.columns[colId].cells = {
          ...response.columns[colId].cells,
          ...cells
        }
      });
    }); 
  });

  return response;
}
