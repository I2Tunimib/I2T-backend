import { Router } from "express";
import ModificationController from "../controllers/modification.controller.js";
import asyncMiddleware from "../middleware/async.middleware.js";
import datasetAccessMiddleware from "../middleware/dataset-access.middleware.js";

const router = Router();

// Define routes for Configuration
router.get("/list", asyncMiddleware(ModificationController.list));
router.post(
  "/*",
  datasetAccessMiddleware,
  asyncMiddleware(ModificationController.modify),
);

export default router;
