import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware.js';
import ReconciliationController from '../controllers/reconciliation.controller.js';

const router = Router();

// Define routes for Configuration
router.get('/list', asyncMiddleware(ReconciliationController.list));
router.post('/*/dataset/:idDataset/table/:idTable', asyncMiddleware(ReconciliationController.fullAnnoation));
router.post('/*', asyncMiddleware(ReconciliationController.reconcile));

export default router;

