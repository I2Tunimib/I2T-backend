const ExportService = {
  w3c: async ({ columns, rows, keepMatching = false }) => {

    const getMetadata = (
      metadata,
      keepMatching
    ) => {
      if (keepMatching) {
        return metadata.filter((meta) => meta.match);
      }
      return metadata;
    };

    const firstRow = Object.keys(columns).reduce((acc, colId, index) => {
      const {
        id,
        status,
        context,
        ...propsToKeep
      } = columns[colId];

      const standardContext = Object.keys(context).reduce((accCtx, prefix) => {
        const { uri } = context[prefix];
        return [...accCtx, { prefix: `${prefix}:`, uri }];
      }, []);

      acc[`th${index}`] = {
        ...propsToKeep,
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
