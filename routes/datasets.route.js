import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware';
import DatasetsController from '../controllers/datasets.controller';

const router = Router();

// Define routes for Configuration
router.get('/', asyncMiddleware(DatasetsController.getAllDatasets));
router.get('/search', asyncMiddleware(DatasetsController.search));
router.get('/:idDataset', asyncMiddleware(DatasetsController.getOneDataset));
router.get('/:idDataset/table', asyncMiddleware(DatasetsController.getAllTablesByDataset));
router.get('/:idDataset/table/:idTable', asyncMiddleware(DatasetsController.getTable));
router.get('/:idDataset/table/:idTable/export', asyncMiddleware(DatasetsController.exportTable));
router.post('/', asyncMiddleware(DatasetsController.addDataset));
router.put('/:idDataset/table/:idTable', asyncMiddleware(DatasetsController.updateTable));


export default router;

