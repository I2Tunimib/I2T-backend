import { Router } from 'express';
import ExtensionController from '../controllers/extension.controller.js';
import asyncMiddleware from '../middleware/async.middleware.js';

const router = Router();

// Define routes for Configuration
router.get('/list', asyncMiddleware(ExtensionController.list));
router.post('/*', asyncMiddleware(ExtensionController.extend));

export default router;

