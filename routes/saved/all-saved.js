module.exports = (router, fs) => {
    router.get('/saved', (req, res) => {
        const tables = fs.readdirSync('./public/saved', { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
        
        res.json(tables);
    })
}