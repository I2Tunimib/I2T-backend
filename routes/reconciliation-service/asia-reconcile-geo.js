const { CONFIG } = require('../../config');
const axios = require('axios').default;


module.exports = (router) => {
  router.post('/asia/reconcile/geonames', (req, res) => {
    const { data } = req.body;

    const queries = data.reduce((acc, { id, label }) => ({
        ...acc,
        [id]: { query: encodeURIComponent(label || '') }
    }), {})

    // console.log(queries);

    // const request = data.map(col => {
    //   const key = Object.keys(col)[0];

    //   return col[key].reduce((acc, item) => {
    //     acc[`${key}-${item.id}`] = {query: encodeURIComponent(item.label || '')}
    //     return acc;
    //   }, {})
    // })

    // const queries = request.reduce((acc, colValue) => ({...acc, ...colValue}), {})

    // const encodedKey = 'queries';
    // const encodedValue = JSON.stringify(queries);
    const formBody = 'queries=' + JSON.stringify(queries);
    console.log(formBody);
    axios.post(`${CONFIG.ASIA_RECONCILIATION}/geonames`, formBody)
        .then((apiResponse)=> {
          const { data } = apiResponse;

          const response = Object.keys(data).reduce((acc, id)=> ({
            ...acc,
            [id]: {
              metadata: data[id].result
            }
          }), {});
          res.json(response);
        })
        .catch((err)=>{
            // res.send({error: err});
            console.log(err);
        })
  })
}