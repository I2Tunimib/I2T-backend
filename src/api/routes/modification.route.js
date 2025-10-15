import { Router } from 'express';
import ModificationController from '../controllers/modification.controller.js';
import asyncMiddleware from '../middleware/async.middleware.js';

const router = Router();

// Define routes for Configuration
router.get('/list', asyncMiddleware(ModificationController.list));
router.post('/*', asyncMiddleware(ModificationController.modify));

export default router;
