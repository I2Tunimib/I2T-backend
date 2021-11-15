import axios from 'axios';
import CONFIG from '../../config/index';
import reconciliationPipeline from '../services/reconciliation/reconciliation-pipeline';

const ReconciliationController = {
  reconcile: async (req, res, next) => {
    try {
      res.json(await reconciliationPipeline(req.body))
    } catch (err) {
      next(err);
    }
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
  }
}

export default ReconciliationController;
