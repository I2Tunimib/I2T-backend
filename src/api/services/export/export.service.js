import { parse } from 'json2csv'

const ExportService = {
  rawJson: async ({ columns, rows }) => {
    return Object.keys(rows).map((rowId) => {
      const colIds = Object.keys(rows[rowId].cells);

      return colIds.reduce((acc, colId) => {
        acc[columns[colId].label] = rows[rowId].cells[colId].label
        return acc;
      }, {});
    })

  },
  csv: async ({ columns, rows }) => {
    const jsonData = await ExportService.rawJson({ columns, rows });
    return parse(jsonData);
  },
  w3c: async ({ columns, rows, keepMatching = false }) => {

    const getMetadata = (
      metadata = [],
      keepMatching
    ) => {
      if (keepMatching) {
        return metadata.filter((meta) => meta.match).map(({ name, ...rest }) => ({
          name: name.value,
          ...rest
        }));
      }
      return metadata.map(({ name, ...rest }) => ({
        name: name.value,
        ...rest
      }));
    };

    const firstRow = Object.keys(columns).reduce((acc, colId, index) => {
      const {
        id,
        status,
        context,
        metadata,
        annotationMeta,
        ...propsToKeep
      } = columns[colId];

      const standardContext = Object.keys(context).reduce((accCtx, prefix) => {
        const { uri } = context[prefix];
        return [...accCtx, { prefix: `${prefix}:`, uri }];
      }, []);
      
      acc[`th${index}`] = {
        ...propsToKeep,
        metadata: metadata.length > 0 ? [{
          ...metadata[0],
          ...(metadata[0].entity && {
            entity: getMetadata(metadata[0].entity, keepMatching)
          })
        }] : [],
        context: standardContext
      };
      return acc;
    }, {});

    const rest = Object.keys(rows).map((rowId) => {
      const { cells } = rows[rowId];
      return Object.keys(cells).reduce((acc, colId) => {
        const {
          id,
          metadata,
          annotationMeta,
          ...propsToKeep
        } = cells[colId];

        acc[colId] = {
          ...propsToKeep,
          metadata: getMetadata(metadata, keepMatching)
        };
        return acc;
      }, {});
    });

    return [firstRow, ...rest]
  }
}

export default ExportService;
