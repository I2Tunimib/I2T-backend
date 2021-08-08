module.exports = (router, fs) => {
    const readData = (path) => {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'utf-8', (err, file) => {
                if (err)
                    reject(err);
                else
                    resolve(file);
            });
        });
    }


    router.get('/saved/:name', (req, res) => {

        const promises = ['application', 'data'].map(file => 
            readData(`./public/saved/${req.params.name}/${req.params.name}-${file}.json`)
        );

        Promise.all(promises).then((files) => {
            res.json({
                application: JSON.parse(files[0]),
                data: JSON.parse(files[1])
            })         
        }).catch(err => {
            res.json({error: err}); 
        });


    })
}