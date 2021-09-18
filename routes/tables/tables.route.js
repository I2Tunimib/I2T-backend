import { Router } from 'express';
import asyncMiddleware from '../../middleware/async.middleware';
import TablesController from '../../controllers/tables/tables.controller';

const router = Router();

// Define routes for Configuration
router.get('/', asyncMiddleware(TablesController.getTables));
router.get('/:id', asyncMiddleware(TablesController.getTable));
router.post('/', asyncMiddleware(TablesController.createTable));
router.post('/save', asyncMiddleware(TablesController.saveTable));
router.delete('/:id', asyncMiddleware(TablesController.deleteTable));

export default router;

