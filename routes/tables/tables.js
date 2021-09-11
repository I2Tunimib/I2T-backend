module.exports = (router, fs) => {

  const getTableDate = (tables, tableId) => {
    const tableInfo = tables[tableId];
    const tablePath = tableInfo.type === 'raw' ? `./public/raw-tables/` : './public/annotated-tables';
    const stats = fs.statSync(`${tablePath}/${tableId}.${tables[tableId].format}`);
    return stats.mtime;
  }
  

  router.get('/tables', (req, res, next) => {
    const search = req.query.search;
    const type = req.query.type || 'raw';

    if (search) {
      fs.readFile('./public/tables.info.json', (err, data) => {
        if (err) {
          return next(err)
        }
        const tableMetadata = JSON.parse(data);
        const regex = new RegExp(search.toLowerCase());
        const filteredTables = Object.keys(tableMetadata)
          .filter((tableId) => regex.test(tableMetadata[tableId].name.toLowerCase()))
          .map((tableId) => {
            return {
              ...tableMetadata[tableId],
              lastModifiedDate: getTableDate(tableMetadata, tableId)
            }
          }).slice(0, 10);
          res.json(filteredTables);
      });
    } else {
      fs.readFile('./public/tables.info.json', (err, data) => {
        if (err) {
          return next(err)
        }
        const tableMetadata = JSON.parse(data);
        const tables = Object.keys(tableMetadata).reduce((acc, tableId) => {
          if (tableMetadata[tableId].type === type) {
            try {
              const table = {
                ...tableMetadata[tableId],
                lastModifiedDate: getTableDate(tableMetadata, tableId)
              }
              acc.push(table);
            } catch {
              return next(err)
            }
          }
          return acc;
        }, []);
        res.json(tables.sort((tableA, tableB) => {
          const dateA = new Date(tableA.lastModifiedDate);
          const dateB = new Date(tableB.lastModifiedDate);
          return dateA < dateB ? 1 : -1;
        }));
      });
    }    
  })
}
