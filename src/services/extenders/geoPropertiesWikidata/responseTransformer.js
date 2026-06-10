import fs from "fs";

const PROPS = {
  // latitude and logitude
  P625: {
    label: 'coordinate location',
    getColumn: (colId) => {
      return {
        label: colId,
        kind: 'entity',
        datatype: 'PLACE',
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
    label: 'located in time zone',
    getColumn: (colId) => {
      return {
        label: colId,
        kind: 'entity',
        datatype: 'OTHER',
        metadata: [],
        cells: {}
      }
    },
    getCell: ({ entities, entityId, prop }) => {
      const claims = entities[entityId]?.claims?.[prop];
      if (!claims || claims.length === 0) {
        return { label: null, metadata: [] };
      }
      const targetTimezoneId = claims[0].mainsnak.datavalue.value.id;
      const timezoneEntity = entities[targetTimezoneId];
      const readableLabel = timezoneEntity?.labels?.en?.value;
      return {
        label: timezoneEntity.labels.en.value,
        metadata: [
          {
            id: `wd:${targetTimezoneId}`,
            name: readableLabel,
            match: true,
            score: 100,
            type: []
          }
        ]
      };
    }
  },
  // postal code
  P281: {
    label: 'postal code',
    getColumn: (colId) => {
      return {
        label: colId,
        kind: 'literal',
        datatype: 'NUMBER',
        metadata: [],
        cells: {}
      }
    },
    getCell: ({ entities, entityId, prop }) => {
      const claims = entities[entityId]?.claims?.[prop];
      if (!claims || claims.length === 0) {
        return {label: null, metadata: []};
      }
      const postalCodeValue = claims[0].mainsnak.datavalue.value;
      return {
        label: postalCodeValue,
        metadata: []
      };
    }
  }
}

export default async (req, res) => {

  // fs.writeFile('../../fileSemTUI/wikidataEXT-responseTransformers.json', JSON.stringify(res), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/wikidataEXT-responseTransformers.json saved!');
  // });

  const { items, props } = req.processed;
  const inputColumns = Object.keys(items);

  const { property } = props;

  const columnName = inputColumns[0];

  let response = {
    columns: {},
    meta: {},
    originalColMeta: {
      originalColName: columnName,
      types: [],
      properties: []
    }
  }

  const propertyTypes = {
    P625: { id: "wd:Q104224919", name: "geographic coordinate" },
    P421: { id: "wd:Q12143", name: "time zone" },
    P281: { id: "wd:Q37447", name: "postal code" }
  };

  res.forEach((serviceResponse, colIndex) => {
    const { entities } = serviceResponse.res;
    const sourceColId = inputColumns[colIndex];

    property.forEach((prop) => {
      // get label, getColumn and getCell for the current prop
      const { label, getColumn, getCell } = PROPS[prop];

        const colId = `${sourceColId}_${label}`;
        // create columns
        response.columns[colId] = getColumn(colId);

      if (!response.originalColMeta.properties.some((p) => p.id === `wd:${prop}`)) {
        response.originalColMeta.properties.push({
          id: `wd:${prop}`,
          obj: colId,
          name: label,
          match: true,
          score: 1,
        });
      }

      const typeInfo = propertyTypes[prop];
      const columnTypesArray = typeInfo ? [{
        id: typeInfo.id,
        name: typeInfo.name,
        match: true,
        score: 100
      }] : [];

      response.columns[colId].metadata[0] = {
        id: `wd:${prop}`,
        name: label,
        match: true,
        score: 100,
        type: columnTypesArray
      };

        // add cells to each column
       Object.keys(entities).forEach((entityId) => {
         // get rows for each metaId
         const requestRowsIds = items[inputColumns[colIndex]][`wd:${entityId}`];

         // build cells
         const cells = requestRowsIds.reduce((acc, rowId) => {
           // get a cell for the appropriate prop
           acc[rowId] = getCell({entities, entityId, prop})
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
        [colId]: sourceColId
      }
    });

  });

  return response;
}
