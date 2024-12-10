import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware.js';
import ConfigController from '../controllers/config.controller.js';

const router = Router();

// Define routes for Configuration
router.get('/', asyncMiddleware(ConfigController.getConfig));

export default router;

