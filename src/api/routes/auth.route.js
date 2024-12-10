import { Router } from 'express';
import asyncMiddleware from '../middleware/async.middleware.js';
import AuthController from '../controllers/auth.controller.js';


const router = Router();

router.post('/signin', asyncMiddleware(AuthController.signIn));
router.post('/me', asyncMiddleware(AuthController.me));



export default router;

