import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import DatasetsController from "../controllers/datasets.controller.js";

const router = Router();

// Define routes for Configuration
router.get("/", asyncMiddleware(DatasetsController.getAllDatasets));
router.get("/search", asyncMiddleware(DatasetsController.search));
router.get("/:idDataset", asyncMiddleware(DatasetsController.getOneDataset));
router.get(
  "/:idDataset/table",
  asyncMiddleware(DatasetsController.getAllTablesByDataset),
);
router.get(
  "/:idDataset/table/:idTable/dependencies",
  asyncMiddleware(DatasetsController.getDependencies),
);
router.get(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.getTable),
);
router.get(
  "/:idDataset/table/:idTable/export",
  asyncMiddleware(DatasetsController.exportTable),
);
router.get(
  "/:idDataset/table/:idTable/export",
  asyncMiddleware(DatasetsController.exportTable),
);
router.get(
  "/:idDataset/table/:idTable/code",
  asyncMiddleware(DatasetsController.exportTableCode),
);
router.post("/", asyncMiddleware(DatasetsController.addDataset));
router.post("/:idDataset/table", asyncMiddleware(DatasetsController.addTable));

// ACL routes
router.post(
  "/:idDataset/acl/viewers",
  asyncMiddleware(DatasetsController.addViewer),
);
router.delete(
  "/:idDataset/acl/viewers",
  asyncMiddleware(DatasetsController.removeViewer),
);
router.post(
  "/:idDataset/acl/editors",
  asyncMiddleware(DatasetsController.addEditor),
);
router.delete(
  "/:idDataset/acl/editors",
  asyncMiddleware(DatasetsController.removeEditor),
);
router.post(
  "/:idDataset/acl/visibility",
  asyncMiddleware(DatasetsController.setVisibility),
);
// Table ACL routes
router.get(
  "/:idDataset/table/:idTable/acl",
  asyncMiddleware(DatasetsController.getTableAcl),
);
router.post(
  "/:idDataset/table/:idTable/acl/viewers",
  asyncMiddleware(DatasetsController.addTableViewer),
);
router.delete(
  "/:idDataset/table/:idTable/acl/viewers",
  asyncMiddleware(DatasetsController.removeTableViewer),
);
router.post(
  "/:idDataset/table/:idTable/acl/editors",
  asyncMiddleware(DatasetsController.addTableEditor),
);
router.delete(
  "/:idDataset/table/:idTable/acl/editors",
  asyncMiddleware(DatasetsController.removeTableEditor),
);
router.post(
  "/:idDataset/table/:idTable/acl/visibility",
  asyncMiddleware(DatasetsController.setTableVisibility),
);
router.post(
  "/track/:idDataset/:idTable",
  asyncMiddleware(DatasetsController.trackTable),
);
router.post(
  "/:idDataset/table/:idTable/compliance",
  asyncMiddleware(DatasetsController.makeCompliance),
);
router.put(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.updateTable),
);
router.delete("/:idDataset", asyncMiddleware(DatasetsController.removeDataset));
router.delete(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.removeTable),
);
router.get(
  "/:idDataset/table/:idTable/operation/:opId/downstream",
  asyncMiddleware(DatasetsController.getOperationDownstreamDeps),
);
router.post(
  "/:idDataset/table/:idTable/operation/:opId/redo",
  asyncMiddleware(DatasetsController.redoOperation),
);
router.delete(
  "/:idDataset/table/:idTable/operation/:opId",
  asyncMiddleware(DatasetsController.deleteOperation),
);

// Table lock routes
router.post(
  "/lock/:tableId/acquire",
  asyncMiddleware(DatasetsController.acquireTableLock),
);
router.post(
  "/lock/:tableId/release",
  asyncMiddleware(DatasetsController.releaseTableLock),
);

export default router;
