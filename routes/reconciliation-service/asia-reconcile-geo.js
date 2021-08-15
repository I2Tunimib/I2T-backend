const { CONFIG } = require('../../config');
const axios = require('axios').default;


module.exports = (router) => {
    router.post('/asia/reconcile/geonames', (req, res)=>{
        const { data } = req.body;

        const request = data.map(col => {
          const key = Object.keys(col)[0];

          return col[key].reduce((acc, item, index) => {
            acc[`${key}-${index}`] = {query: encodeURIComponent(item.label || '')}
            return acc;
          }, {})
        })

        const queries = request.reduce((acc, colValue) => ({...acc, ...colValue}), {})
        
        const encodedKey = 'queries';
        const encodedValue = JSON.stringify(queries);
        const formBody = encodedKey + '=' + encodedValue;
        axios.post(`${CONFIG.ASIA_RECONCILIATION}/geonames`, formBody)
            .then((resp)=>{
                const serviceData = resp.data;
                
                const response = data.reduce((acc, col) => {
                  const key = Object.keys(col)[0];
                  acc[key] = col[key].map((_, index) => (
                    {metadata: serviceData[`${key}-${index}`].result || []}
                  ))
                  return acc;
                }, {})

                res.json({data: response});
            })
            .catch((err)=>{
                // res.send({error: err});
                console.log(err);
            })
    })
}