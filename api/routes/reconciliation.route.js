import { Router } from 'express';
import asyncMiddleware from '../../middleware/async.middleware';
import ReconciliationController from '../controllers/reconciliation.controller';

const router = Router();

// Define routes for Configuration
router.get('/list', asyncMiddleware(ReconciliationController.list));
router.post('/*', asyncMiddleware(ReconciliationController.reconcile));

export default router;

