module.exports = (router, fs) => {
    router.get('/saved/:name', (req, res) => {
        fs.readFile(`./public/saved/${req.params.name}.json`, "utf-8", (err, file) => {
            if(err) {
                res.send({error: err});
                return;
            }  
            console.log(file);
            res.send(file);
        })
    })
}