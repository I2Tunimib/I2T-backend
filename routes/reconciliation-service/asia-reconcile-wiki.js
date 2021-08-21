const { CONFIG } = require('../../config');
const axios = require('axios').default;



module.exports = (router) => {
    router.post('/asia/reconcile/wikifier', (req, res, next) => {
      const data = req.body;

      const queries = data.reduce((acc, { id, label }) => ({
          ...acc,
          [id]: { query: encodeURIComponent(label || '') }
      }), {})
  
      const formBody = 'queries=' + JSON.stringify(queries);
      axios.post(`${CONFIG.ASIA_RECONCILIATION}/wikifier`, formBody)
          .then((apiResponse)=> {
            const { data } = apiResponse;
  
            const response = Object.keys(data).map((id) => ({
              id,
              metadata: data[id].result
            }));
            res.json(response);
          })
          .catch((err)=>{
              next(err);
          })
    })
}