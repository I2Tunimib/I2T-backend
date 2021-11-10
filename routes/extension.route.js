import { Router } from 'express';
import ExtensionController from '../controllers/extension.controller';
import asyncMiddleware from '../middleware/async.middleware';

const router = Router();

// Define routes for Configuration
router.post('/*', asyncMiddleware(ExtensionController.extendWithService));
// router.post('/asia/geonames', asyncMiddleware(ExtensionController.extendAsiaGeo));
// router.post('/asia/weather', asyncMiddleware(ExtensionController.extendAsiaWeather));

export default router;

