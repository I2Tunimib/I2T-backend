import { Router } from 'express';
import configRoutes from './config/config.route';
import reconciliationRoutes from './reconciliation/reconciliation.route';
import tablesRoutes from './tables/tables.route';

const router = Router();

// const axios = require('axios').default;
// const fs  = require('fs');

// cors
// var cors = require('cors');
// router.use();




// axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36' // for all requests

// //config
// require('./config-route/config-route')(router, fs);


// // reconciliation routes
// require('./reconciliation-service/asia-reconcile-wiki')(router);
// require('./reconciliation-service/asia-reconcile-geo')(router);
// require('./reconciliation-service/asia-reconcile-keywordsmatcher')(router);
// require('./reconciliation-service/wikidata-reconcile')(router);
// require('./reconciliation-service/lamapi-reconcile')(router);
// require('./reconciliation-service/reconcile')(router);

// // extension routes
// require('./extension-service/asia-extend-weather')(router, fs);
// require('./extension-service/asia-extend-geonames')(router);

// // table routes
// require('./tables/tables')(router, fs);
// require('./tables/get-table')(router, fs);

// // save routes
// require('./saved/all-saved')(router, fs);
// require('./saved/get-saved')(router, fs);
// require('./saved/put-saved')(router, fs, cors);

// // upload
// require('./tables/import-table')(router, fs);
// require('./tables/upload')(router, fs);

// // fs
// require('./tables/file-system')(router, fs);

router.get('/', (req, res) => {
    res.send('Welcome to reconciliator service API');
})

router.use('/config', configRoutes);
router.use('/reconciliators', reconciliationRoutes);
router.use('/tables', tablesRoutes);

export default router;
