module.exports = (router, fs) => {
    router.get('/saved', (req, res) => {
        fs.readdir('./public/saved', (err, files)=>{
            if(err) {
                res.send({error: err});
                return;
            }
            const tableArr = [];
            files.forEach(file => {
                tableArr.push(file.split('.')[0]);
            });
            res.send(tableArr);
        })
    })
}