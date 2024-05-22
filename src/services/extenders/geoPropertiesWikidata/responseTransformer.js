import fs from "fs";

const PROPS = {
  // latitude and logitude
  P625: {
    label: 'Latitude_Longitude',
    getColumn: (colId) => {
      return {
        label: colId,
        metadata: [],
        cells: {}
      }
    },
    getCell: ({ entities, entityId, prop }) => { 
      const { value } = entities[entityId].claims[prop][0].mainsnak.datavalue
      return {
        label: `${value.latitude},${value.longitude}`,
        metadata: []
      }
    }
  },
  // timezone
  P421: {
    label: 'Time zone',
    getColumn: (colId) => {
      return {
        label: colId,
        metadata: [],
        cells: {}
      }
    },
    getCell: ({ entities, entityId, prop }) => {
      // implement this
      return null
    }
  },
  // postal code
  P281: {
    label: 'Postal code',
    getColumn: (colId) => {
      return {
        label: colId,
        metadata: [],
        cells: {}
      }
    },
    getCell: ({ entities, entityId, prop }) => {
      // implement this
      return null
    }
  }
}

export default async (req, res) => {

  fs.writeFile('/Users/flaviodepaoli/fileSemTUI/wikidataEXT-responseTransformers.json', JSON.stringify(res), function (err) {
    if (err) throw err;
    console.log('File /Users/flaviodepaoli/fileSemTUI/wikidataEXT-responseTransformers.json saved!');
  });

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
      // get label, getColumn and getCell for the current prop
      const { label, getColumn, getCell } = PROPS[prop];
      
        const colId = `${inputColumns[colIndex]}_${label}`;
        // create columns
        response.columns[colId] = getColumn(colId);

        // add cells to each column
        Object.keys(entities).forEach((entityId) => {
          // get rows for each metaId
          const requestRowsIds = items[inputColumns[colIndex]][`wd:${entityId}`];

          // build cells
          const cells = requestRowsIds.reduce((acc, rowId) => {
            // get a cell for the appropriate prop
            acc[rowId] = getCell({ entities, entityId, prop })
            return acc;
          }, {});

          // add cells to column
          response.columns[colId].cells = {
            ...response.columns[colId].cells,
            ...cells
          }
        });

        // add columns mapping
        response.meta = {
          ...response.meta,
          [colId]: inputColumns[colIndex]
        }
    });

  });

  return response;
}