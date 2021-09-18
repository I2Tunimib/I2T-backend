import axios from 'axios';
import CONFIG from '../../config/index';

const ReconciliationController = {
  asiaGeo: async (req, res, next) => {
    const data = req.body; 

    const queries = data.reduce((acc, { id, label }) => ({
        ...acc,
        [id]: { query: encodeURIComponent(label || '') }
    }), {})

    const formBody = 'queries=' + JSON.stringify(queries);
    axios.post(`${CONFIG.ASIA_RECONCILIATION}/geonames`, formBody)
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
  },
  asiaKeywordsMatcher: async (req, res, next) => {
    const data = req.body;

    const queries = data.reduce((acc, { id, label }) => ({
        ...acc,
        [id]: { query: encodeURIComponent(label || '') }
    }), {})

    const formBody = 'queries=' + JSON.stringify(queries);
    axios.post(`${CONFIG.ASIA_RECONCILIATION}/keywordsmatcher`, formBody)
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
  },
  asiaWikifier: async (req, res, next) => {
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
  },
  lamapi: async (req, res, next) => {
    const items = req.body.items;
    const response = {
        name: req.body.name,
        items: []
    };
    // for each item of a column
    for (const item of items) {
        try {
            // get candidate entities from LamAPI (Limit entities to 25)
            const lamRes = await axios.get(`${CONFIG.LAMAPI_BASE}/labels?name=${item.label}&limit=25&token=${CONFIG.LAMAPI_TOKEN}`)
            if (lamRes.data) {
                response.items.push({
                    column: item.column,
                    index: item.index,
                    label: item.label,
                    metadata: lamRes.data.q0.result
                });
            }
        } catch (err) {
            res.json({error: err});
            return;
        }
    }

    res.json(response);
  },
  wikidata: async (req, res, next) => {
    const data = req.body;

    const queries = data.reduce((acc, { id, label }) => ({
      ...acc,
      [id]: { query: encodeURIComponent(label || '') }
    }), {})

    const formBody = 'queries=' + JSON.stringify(queries);
    axios.post(CONFIG.WIKIDATA, formBody)
      .then((apiResponse) => {
        const { data } = apiResponse;

        const response = Object.keys(data).map((id) => ({
          id,
          metadata: data[id].result
        }));
        res.json(response);
      })
      .catch((err) => {
        next(err);
      })
  }
}

export default ReconciliationController;
