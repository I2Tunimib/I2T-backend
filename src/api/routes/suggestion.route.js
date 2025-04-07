import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import AuthController from "../controllers/auth.controller.js";
import SuggestionsController from "../controllers/suggestion.controller.js";

const router = Router();

router.post("/wikidata", asyncMiddleware(SuggestionsController.wikidata));

export default router;
