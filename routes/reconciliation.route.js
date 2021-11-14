import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware';
import ReconciliationController from '../controllers/reconciliation.controller';

const router = Router();

// Define routes for Configuration
router.post('/*', asyncMiddleware(ReconciliationController.reconcile));
// router.post('/lamapi', asyncMiddleware(ReconciliationController.lamapi));
// router.post('/asia/geonames', asyncMiddleware(ReconciliationController.asiaGeo));
// router.post('/asia/keywordsmatcher', asyncMiddleware(ReconciliationController.asiaKeywordsMatcher));
// router.post('/asia/wikifier', asyncMiddleware(ReconciliationController.asiaWikifier));
// router.post('/wikidata', asyncMiddleware(ReconciliationController.wikidata));

export default router;

