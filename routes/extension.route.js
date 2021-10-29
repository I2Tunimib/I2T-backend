import { Router } from 'express';
import ExtensionController from '../controllers/extension.controller';
import asyncMiddleware from '../middleware/async.middleware';

const router = Router();

// Define routes for Configuration
router.post('/asia/geonames', asyncMiddleware(ExtensionController.extendAsiaGeo));

export default router;

