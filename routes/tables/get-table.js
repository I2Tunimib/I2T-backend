module.exports = (router, fs) => {
  router.get('/tables/:id', (req, res, next) => {

    const { headers, params } = req;
    const acceptHeader = headers.accept;

    fs.readFile('./public/tables.info.json', (err, data) => {
      const tableInfoData = JSON.parse(data);
      const tableMetadata = tableInfoData[params.id];
      const tableBasePath = tableMetadata.type === 'raw' ? `./public/raw-tables/` : './public/annotated-tables';
      const filePath = `${tableBasePath}/${params.id}.${tableMetadata.format}`;
      
      if (acceptHeader === 'application/octet-stream') {
        res.download(filePath);
      } else {
        fs.readFile(filePath, "utf-8", (err, file) => {
          if (err) {
            return next(err)
          } 
          res.json({
            ...tableMetadata,
            data: file
          });
        })
      }
    });
  })
}
