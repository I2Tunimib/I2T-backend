const axios = require('axios').default;
const yaml = require('js-yaml');


module.exports = (router, fs) => {
    router.get('/config', (req, res) => {
        // try {
        fs.readFile('config.yml', 'utf-8', (err, data) => {
            if (err) {
                console.log(err)
                res.send({ error: "Impossible to retrieve config file" });
                return;
            } else {
                res.send(yaml.load(data));
            }
        }
        )
    })
}