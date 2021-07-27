const { CONFIG } = require('../../config');
const axios = require('axios').default;
const qs = require('qs');
const yaml = require('js-yaml');

module.exports = (router, fs) => {
    router.post('/asia/extend/weather', (req, res) => {
        console.log(req.body);
        const idsToSend = req.body.ids.filter((value) => {
            if (value) {
                return value
            }
        }).join(',');
        //console.log(idsToSend);
        const datesToSend = req.body.dates.filter((value) => {
            if (value) {
                return value
            }
        }).join(',');
        //console.log(datesToSend);
        const weatherParamsToSend = req.body.weatherParameters.filter((value) => {
            if (value) {
                return value
            }
        }).join(',');
        // console.log(weatherParamsToSend);
        const offsetsToSend = req.body.offsets.filter((value) => {
            if (value) {
                return value
            }
        }).join(',');
        //console.log(offsetsToSend);
        const params = qs.stringify({
            ids: idsToSend,
            dates: datesToSend,
            weatherParams: weatherParamsToSend,
            offsets: offsetsToSend
        })
        //console.log(params);
        axios.post(`${CONFIG.ASIA_EXTENSION}/weather`, params)
            .then((resp) => {
                let config = undefined;
                fs.readFile('config.yml', 'utf-8', (err, data) => {
                    if (err) {
                        console.log(err)
                        res.send({ error: "Impossible to retrieve config file" });
                        return;
                    } else {
                        config = yaml.load(data);
                        res.send({
                            items: resp.data.map((el) => {
                                const elementToReturn = { ...el }
                                for (const param of el.weatherParameters) {
                                    //console.log(config);
                                    /*console.log(el);
                                    console.log(el.weatherParameters.avgValue);
                                    elementToReturn[param.id] = param.avgValue;*/
                                    for (const weath of config.extensionServices[0].requiredParams[2].values) {
                                        const paramKeys = Object.keys(param);
                                        for (const paramKey of paramKeys) {
                                            if (paramKey === weath.responseValue) {
                                                //console.log('ciao');
                                                //console.log(param.id);
                                                elementToReturn[param.id] = param[weath.responseValue]
                                            }
                                        }
                                    }
                                }
                                elementToReturn.ids = elementToReturn.geonamesId;
                                elementToReturn.dates = elementToReturn.date.split('T')[0];
                                delete elementToReturn.geonamesId;
                                delete elementToReturn.date;
                                delete elementToReturn.weatherParameters;
                                delete elementToReturn.offset;
                                return (elementToReturn)
                            })
                        });
                    }
                });

            })
            .catch((err) => {
                console.log(err);
                res.send(err);
            })
    })
}