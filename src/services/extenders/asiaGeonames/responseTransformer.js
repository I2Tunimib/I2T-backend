import { KG_INFO } from "../../../utils/constants";

export default async (req, res) => {
  // response is an array of responses coming from the extension service (one for each column)
  const { items } = req;

  const inputColumnsLabels = Object.keys(items);

  let response = {
    columns: {},
    rows: {},
    meta: {}
  }

  // build each column in standard format
  // for each input column a set of extended column is created
  res.forEach((serviceResponse, colIndex) => {
    // each meta is a property which identifies a new column
    const { meta, rows } = serviceResponse.res;
    const { idsMap } = serviceResponse

    const standardCol = meta.reduce((acc, property) => {
      const { id: propId } = property;
      const colId = `${inputColumnsLabels[colIndex]}_${propId}`;
      // add column
      acc.columns[colId] = {
        id: colId,
        label: colId,
        metadata: []
      }
      acc.meta[colId] = inputColumnsLabels[colIndex];
      // add rows
      acc.rows = Object.keys(rows).reduce((accRows, metaId) => {
        const metadataItems = rows[metaId][propId];
        const rowId = idsMap[metaId];
        const cellId = `${rowId}$${colId}`;
        // check if service returned something
        if (metadataItems && metadataItems.length > 0) {
          // get first one
          const { id: metadataItemId, name: metadataItemName } = metadataItems[0];

          accRows[rowId] = {
            id: rowId,
            cells: {
              ...(accRows[rowId] && { ...accRows[rowId].cells }),
              [colId]: {
                id: cellId,
                label: metadataItemName,
                metadata: [{
                  id: `geo:${metadataItemId}`,
                  name: { value: metadataItemName, uri: `${KG_INFO.geo.uri}${metadataItemId}` },
                  match: true,
                  score: 100
                }],
                annotationMeta: {
                  annotated: true,
                  match: { value: true, reason: 'reconciliator' },
                  lowestScore: 100,
                  highestScore: 100
                }
              }
            }
          }
        } else {
          accRows[rowId] = {
            id: rowId,
            cells: {
              ...(accRows[rowId] && { ...accRows[rowId].cells }),
              [colId]: {
                id: cellId,
                label: 'null',
                metadata: [],
                annotationMeta: {
                  annotated: false,
                  match: { value: false },
                  lowestScore: 0,
                  highestScore: 0
                }
              },
            }
          }
        }
        return accRows;
      }, response.rows)
      return acc;
    }, response);

    response.columns = {
      ...response.columns,
      ...standardCol.columns
    }
    response.rows = {
      ...response.rows,
      ...standardCol.rows
    }
  })
  return response;
}