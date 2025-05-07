import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import AuthController from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", asyncMiddleware(AuthController.signUp));
router.post("/signin", asyncMiddleware(AuthController.signIn));
router.post("/me", asyncMiddleware(AuthController.me));
router.post("/verify", asyncMiddleware(AuthController.verify));

export default router;
