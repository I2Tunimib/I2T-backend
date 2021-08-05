module.exports = (router, fs, cors) => {
    const writeData = (path, filename, data) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${path}/${filename}`, JSON.stringify(data), (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }

    router.put('/saved/:name', cors(), (req, res) => {
        const payload = req.body;

        const pathToDir = `./public/saved/${req.params.name}`;


        if (!fs.existsSync(pathToDir)){
            console.log('HELLOOOO')
            fs.mkdirSync(pathToDir);
        }

        const promises = Object.keys(payload).map(file => 
            writeData(pathToDir, `${req.params.name}-${file}.json`, payload[file])
        );

        Promise.all(promises).then(() => {
            res.json({success: true})         
        }).catch(err => {
            res.json({error: err}); 
        });

    })
}