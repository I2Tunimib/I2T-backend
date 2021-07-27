module.exports = (router, fs, cors) => {
    router.put('/saved/:name' ,cors(), (req, res) => {
       const payload = req.body;
       console.log( payload);
       fs.writeFile(`./public/saved/${req.params.name}.json`, JSON.stringify(payload), (err) => {
           if(err) {
               res.send({error: err});
           } else {
               res.send({success: true})
           }
       })
    })
}