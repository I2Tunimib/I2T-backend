import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware';
import ConfigController from '../controllers/config.controller';

const router = Router();

// Define routes for Configuration
router.get('/', asyncMiddleware(ConfigController.getConfig));

export default router;

