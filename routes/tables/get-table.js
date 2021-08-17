module.exports = (router, fs) => {
  router.get('/tables/:id', (req, res) => {
    fs.readFile(`./public/tables/${req.params.id}.csv`, "utf-8", (err, file) => {
      if (err) {
        res.send({ error: err });
        return;
      }
      const cleanFile = file.replace(/"+/g, '')
      res.json({
        format: 'csv',
        data: cleanFile
      });
    })
  })
}
