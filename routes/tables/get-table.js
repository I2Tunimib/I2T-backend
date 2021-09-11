module.exports = (router, fs) => {
  router.get('/tables/:id', (req, res, next) => {
    fs.readFile('./public/tables.info.json', (err, data) => {
      const tableInfoData = JSON.parse(data);
      const tableMetadata = tableInfoData[req.params.id]
      const tablePath = tableMetadata.type === 'raw' ? `./public/raw-tables/` : './public/annotated-tables'

      fs.readFile(`${tablePath}/${req.params.id}.${tableMetadata.format}`, "utf-8", (err, file) => {
        if (err) {
          return next(err)
        }
        
        res.json({
          ...tableMetadata,
          data: file
        });
      })
    });
  })
}
