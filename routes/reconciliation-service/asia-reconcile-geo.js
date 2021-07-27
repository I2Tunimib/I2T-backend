const { CONFIG } = require('../../config');
const axios = require('axios').default;


module.exports = (router) => {
    router.post('/asia/reconcile/geonames', (req, res)=>{
        const queries = {};
        for (const item of req.body.items) {
            queries[`${req.body.name}-${item.column}-${item.index}`] = {query: item.label};
        }
        const encodedKey = 'queries';
        const encodedValue = JSON.stringify(queries);
        const formBody = encodedKey + '=' + encodedValue;
        axios.post(`${CONFIG.ASIA_RECONCILIATION}/geonames`, formBody)
            .then((resp)=>{
                console.log(resp.data);
                const resToSend = {
                    name: req.body.name,
                    items: []
                };
                    for (const reqItem of req.body.items){
                        if (resp.data[`${req.body.name}-${reqItem.column}-${reqItem.index}`]){
                            resToSend.items.push({
                                column: reqItem.column,
                                index: reqItem.index,
                                label: reqItem.label,
                                metadata: resp.data[`${req.body.name}-${reqItem.column}-${reqItem.index}`].result,
                            })
                        }
                    }
                res.send(resToSend);
            })
            .catch((err)=>{
                res.send({error: err});
                console.log(err);
            })
    })
}