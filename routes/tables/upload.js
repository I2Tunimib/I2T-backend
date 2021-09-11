module.exports = (router, fs) => {
  const getTableName = (tables, tableName, index = 1) => {
    if (!(tableName in tables)) {
      return tableName;
    }
    return getTableName(tables, `${tableName} (${index})`, ++index);
  }

  const getTableDate = (tables, tableId) => {
    const tableInfo = tables[tableId];
    const tablePath = tableInfo.type === 'raw' ? `./public/raw-tables/` : './public/annotated-tables';
    const stats = fs.statSync(`${tablePath}/${tableId}.${tables[tableId].format}`);
    return stats.mtime;
  }

  router.post('/tables/upload', (req, res, next) => {
    const { file } = req.files;
    const { meta } = req.body;
    try {
      // read tables
      const data = fs.readFileSync('./public/tables.info.json');
      const tables = JSON.parse(data);
      // add new table
      const { fileName, fileExtension, separator, type } = JSON.parse(meta);
      let newTable = {
        name: getTableName(tables, fileName),
        format: fileExtension,
        separator,
        type
      };
      tables[newTable.name] = newTable;
      // write new tables
      fs.writeFileSync('./public/tables.info.json', JSON.stringify(tables, null, 2))
      const uploadPath = type === 'raw'
        ? `./public/raw-tables/${newTable.name}.${newTable.format}`
        : `./public/annotated-tables/${newTable.name}.${newTable.format}`;
      // upload file
      file.mv(uploadPath, (err) => {
        if (err) {
          return next(err);
        }

        res.json({
          ...newTable,
          lastModifiedDate: getTableDate(tables, newTable.name)
        })
      });
    } catch (err) {
      next(err);
    }
  });
}
