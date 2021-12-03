import { Router } from 'express';
import configRoutes from './config.route';
import reconciliationRoutes from './reconciliation.route';
import datasetsRoutes from './datasets.route';
import extensionRoutes from './extension.route';

const router = Router();

router.get('/', (req, res) => {
    res.send('Welcome to tUI service API');
})

router.use('/config', configRoutes);
router.use('/full-annotation', reconciliationRoutes);
router.use('/reconciliators', reconciliationRoutes);
router.use('/extenders', extensionRoutes);
router.use('/dataset', datasetsRoutes);

export default router;
