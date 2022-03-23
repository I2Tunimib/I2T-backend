import { KG_INFO } from "../../../utils/constants";

const PROPS = {
  P625: 'Latitude_Longitude',
  P421: 'Time zone',
  P281: 'Postal code'
}

export default async (req, res) => {
  const { items, props } = req.processed;
  const inputColumns = Object.keys(items);

  const { property } = props;

  let response = {
    columns: {},
    meta: {}
  }

  res.forEach((serviceResponse, colIndex) => {
    const { entities } = serviceResponse.res;

    property.forEach((prop) => {
      // for now let's only work with lat&long
      if (prop === 'P625') {
        const colId = `${inputColumns[colIndex]}_${PROPS[prop]}`;
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
        Object.keys(entities).forEach((entityId) => {
          // get rows for each metaId
          const requestRowsIds = items[inputColumns[colIndex]][`wd:${entityId}`];

          // build cells
          const cells = requestRowsIds.reduce((acc, rowId) => {
            // lat and long do not have metadata
            const cellMetadata = [];

            const { value } = entities[entityId].claims[prop][0].mainsnak.datavalue

            acc[rowId] = {
              label: `${value.latitude},${value.longitude}`,
              metadata: cellMetadata
            }
            return acc;
          }, {});

          // add cells to column
          response.columns[colId].cells = {
            ...response.columns[colId].cells,
            ...cells
          }
        });
      }
    });

  });

  return response;
}