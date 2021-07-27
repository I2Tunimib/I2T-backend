module.exports = (router, fs) => {
    router.get('/tables', (req, res) => {
        fs.readdir('./public/tables', (err, files)=>{
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
