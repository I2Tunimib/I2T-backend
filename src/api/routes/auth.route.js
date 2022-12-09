import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware';
import AuthController from '../controllers/auth.controller';


const router = Router();

router.post('/signin', asyncMiddleware(AuthController.signIn));
router.post('/me', asyncMiddleware(AuthController.me));



export default router;

