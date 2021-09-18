module.exports = (router, fs) => {
  router.post('/tables/import', (req, res, next) => {
    console.log(req.files)
  })
}