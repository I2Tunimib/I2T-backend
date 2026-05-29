import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import datasetAccessMiddleware from "../middleware/dataset-access.middleware.js";
import ReconciliationController from "../controllers/reconciliation.controller.js";

const router = Router();

// Define routes for Configuration
router.get("/list", asyncMiddleware(ReconciliationController.list));
router.post(
  "/automatic/dataset/:idDataset/table/:idTable",
  datasetAccessMiddleware,
  asyncMiddleware(ReconciliationController.automaticAnnotation),
);
router.post(
  "/*",
  datasetAccessMiddleware,
  asyncMiddleware(ReconciliationController.reconcile),
);

export default router;
