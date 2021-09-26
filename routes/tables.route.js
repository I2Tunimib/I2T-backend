import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware';
import TablesController from '../controllers/tables.controller';

const router = Router();

// Define routes for Configuration
router.get('/', asyncMiddleware(TablesController.getTables));
router.get('/:id', asyncMiddleware(TablesController.getTable));
router.get('/challenge/datasets', asyncMiddleware(TablesController.getChallengeDatasets));
router.get('/challenge/datasets/:datasetName/tables/:tableName', asyncMiddleware(TablesController.getChallengeTable));
router.post('/', asyncMiddleware(TablesController.createTable));
router.post('/import', asyncMiddleware(TablesController.importTable));
router.post('/save', asyncMiddleware(TablesController.saveTable));
router.delete('/:id', asyncMiddleware(TablesController.deleteTable));

export default router;

