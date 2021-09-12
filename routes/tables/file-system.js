module.exports = (router, fs) => {
  const getTableName = (tables, rawTableName) => {
    const tableName = `${rawTableName} - copy`;

    if (!(tableName in tables)) {
      return tableName;
    }
    return getTableName(tables, `${tableName} - copy`);
  }

  const getTableDate = (tables, tableId) => {
    const tableInfo = tables[tableId];
    const tablePath = tableInfo.type === 'raw' ? `./public/raw-tables/` : './public/annotated-tables';
    const stats = fs.statSync(`${tablePath}/${tableId}.${tables[tableId].format}`);
    return stats.mtime;
  }

  router.post('/tables/copy', (req, res, next) => {
    const { name } = req.body;

    if (!name) {
      return next({ message: 'Must provide the name of the file to copy' });
    }

    try {
      // read tables
      const data = fs.readFileSync('./public/tables.info.json');
      const tables = JSON.parse(data);

      // create new table
      const newTable = {
        ...tables[name],
        name: getTableName(tables, name)
      }


      // copy file
      if (newTable.type === 'raw') {
        const source = `./public/raw-tables/${name}.${newTable.format}`;
        const destination = `./public/raw-tables/${newTable.name}.${newTable.format}`;
        fs.copyFileSync(source, destination);
      }

      // update last modified date
      tables[newTable.name] = {
        ...newTable
      }

      // write new tables
      fs.writeFileSync('./public/tables.info.json', JSON.stringify(tables, null, 2));

      res.json({
        ...newTable,
        lastModifiedDate: getTableDate(tables, newTable.name)
      })
    } catch (err) {
      next(err);
    }
  });

  router.delete('/tables/:name', (req, res, next) => {
    const { name } = req.params;

    if (!name) {
      return next({ message: 'Must provide the name of the file to delete' });
    }

    try {
      // read tables
      const data = fs.readFileSync('./public/tables.info.json');
      const tables = JSON.parse(data);
      const { type, format, ...rest } = tables[name];

      // delete from tables
      delete tables[name];
      // write new tables
      fs.writeFileSync('./public/tables.info.json', JSON.stringify(tables, null, 2));

      // delete file
      if (type === 'raw') {
        fs.rmSync(`./public/raw-tables/${name}.${format}`);
      }

      res.json({
        type,
        format,
        ...rest
      })
    } catch (err) {
      next(err);
    }
  });

}
