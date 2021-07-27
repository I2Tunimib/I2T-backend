const { CONFIG } = require('../../config');
const axios = require('axios').default;
const qs = require('qs');

module.exports = (router) => {
    router.post('/asia/extend/geonames', (req, res) => {
        const extendBody = { ids: req.body.ids, properties: [] };
        const conciliatorBody = 'geonames';
        for (const prop of req.body.properties) {
            extendBody.properties.push({
                id: prop
            })
        }
        console.log(extendBody);
        const params = qs.stringify({
            extend: JSON.stringify(extendBody),
            conciliator: conciliatorBody,
        })
        //console.log(params);
        axios.post(`${CONFIG.ASIA_EXTENSION}/extend`, params)
            .then((resp) => {
                //console.log(resp.data);
                console.log(resp.data.rows);
                if (Object.keys(resp.data.rows).length === 0) {
                    res.send({ error: 'Si è verificato un errore, il sistema non ha ritornato nessun valore' })
                } else {
                    respToSend = {
                        items: []
                    }
                    const idKeys = Object.keys(resp.data.rows);
                    for (const idKey of idKeys) {
                        const propKeys = Object.keys(resp.data.rows[idKey]);
                        const objectToPush = {

                        }
                        objectToPush.ids = idKey;
                        for (const propKey of propKeys) {
                            objectToPush[propKey] = resp.data.rows[idKey][propKey][0];
                            if (objectToPush[propKey]) {
                                objectToPush[propKey].score = 100;
                                objectToPush[propKey].match = true;
                            }
                        }
                        respToSend.items.push(objectToPush);
                    }
                    console.log(respToSend);
                    res.send(respToSend);
                }
            })
            .catch((err) => {
                console.log(err)
                res.send(err);
            })
    })
}