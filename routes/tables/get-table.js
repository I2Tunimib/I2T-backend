module.exports = (router, fs) => {
    router.get('/tables/:id', (req, res) => {
        console.log(req.params);
        fs.readFile(`./public/tables/${req.params.id}.csv`,"utf-8", (err, file) => {
            console.log(file);
            if (err) {
                res.send({error: err});
                return;
            }
            const cleanFile = file.replace(/"+/g,'')
            res.send(cleanFile);
        }) 
    })
}
