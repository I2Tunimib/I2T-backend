import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import DatasetsController from "../controllers/datasets.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Datasets
 *     description: Dataset CRUD and search
 *   - name: Tables
 *     description: Table CRUD, export, compliance, and dependencies
 *   - name: Dataset ACL
 *     description: Dataset-level access control (viewers, editors, visibility)
 *   - name: Table ACL
 *     description: Table-level access control (viewers, editors, visibility)
 *   - name: Operations
 *     description: Operation log management (downstream deps, redo, delete)
 *   - name: Table Locks
 *     description: Optimistic concurrency locks for collaborative editing
 */

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset:
 *   get:
 *     summary: List datasets for the authenticated user
 *     tags: [Datasets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of datasets owned by or shared with the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dataset'
 *       401:
 *         description: Unauthorized
 */
router.get("/", asyncMiddleware(DatasetsController.getAllDatasets));

/**
 * @swagger
/dataset/search:
 *   get:
 *     summary: Search datasets and tables by name
 *     description: Returns up to 5 matching datasets and 5 matching tables visible to the user.
 *     tags: [Datasets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Case-insensitive substring to match against dataset/table names
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datasets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dataset'
 *                 tables:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TableMeta'
 */
router.get("/search", asyncMiddleware(DatasetsController.search));

/**
 * @swagger
/dataset/{idDataset}:
 *   get:
 *     summary: Get a single dataset
 *     tags: [Datasets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     responses:
 *       200:
 *         description: Dataset object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dataset'
 *       401:
 *         description: Unauthorized or no view access
 *       404:
 *         description: Dataset not found
 */
router.get("/:idDataset", asyncMiddleware(DatasetsController.getOneDataset));

/**
 * @swagger
/dataset:
 *   post:
 *     summary: Create a new dataset
 *     description: >
 *       Optionally upload a ZIP file containing pre-populated tables.
 *       If no file is provided an empty dataset is created.
 *     tags: [Datasets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Dataset display name
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional ZIP archive with table CSV files
 *     responses:
 *       200:
 *         description: Updated list of all user datasets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datasets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dataset'
 *       401:
 *         description: Unauthorized
 */
router.post("/", asyncMiddleware(DatasetsController.addDataset));

/**
 * @swagger
/dataset/{idDataset}:
 *   delete:
 *     summary: Delete a dataset and all its tables
 *     tags: [Datasets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       401:
 *         description: Unauthorized — must be dataset owner or editor
 */
router.delete("/:idDataset", asyncMiddleware(DatasetsController.removeDataset));

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset/{idDataset}/table:
 *   get:
 *     summary: List tables in a dataset
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     responses:
 *       200:
 *         description: Array of table metadata objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TableMeta'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table",
  asyncMiddleware(DatasetsController.getAllTablesByDataset),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}:
 *   get:
 *     summary: Get a full table (columns, rows, lock status)
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     responses:
 *       200:
 *         description: Table data including a `_lock` field indicating concurrency status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 columns:
 *                   type: object
 *                 rows:
 *                   type: object
 *                 _lock:
 *                   type: object
 *                   properties:
 *                     isLocked:
 *                       type: boolean
 *                     lockedBy:
 *                       type: integer
 *                       nullable: true
 *                     lockedSince:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.getTable),
);

/**
 * @swagger
/dataset/{idDataset}/table:
 *   post:
 *     summary: Upload a new table (CSV) into a dataset
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Table display name (defaults to filename)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file
 *     responses:
 *       200:
 *         description: Array of updated table metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tables:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TableMeta'
 *       401:
 *         description: Unauthorized — must have edit access to the dataset
 */
router.post("/:idDataset/table", asyncMiddleware(DatasetsController.addTable));

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}:
 *   put:
 *     summary: Save updated table state (annotations, cell edits)
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: >
 *               Full table payload. Must contain either `tableInstance` or `table`
 *               with at least `id` and `idDataset`.
 *     responses:
 *       200:
 *         description: Saved table state
 *       400:
 *         description: Missing tableInstance or idDataset
 *       401:
 *         description: Unauthorized
 *       423:
 *         description: Table locked by another user
 */
router.put(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.updateTable),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}:
 *   delete:
 *     summary: Delete a table from a dataset
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       401:
 *         description: Unauthorized — must have edit access
 */
router.delete(
  "/:idDataset/table/:idTable",
  asyncMiddleware(DatasetsController.removeTable),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/dependencies:
 *   get:
 *     summary: Get the operation dependency graph for a table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     responses:
 *       200:
 *         description: Dependency graph object (operations and edges)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 edges:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table/:idTable/dependencies",
  asyncMiddleware(DatasetsController.getDependencies),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/export:
 *   get:
 *     summary: Export a table in a chosen format
 *     description: >
 *       Supported formats: `w3c` (default), `rdf` (any RDF* prefix), `csv`, `raw`, `report_md`.
 *       `report_md` sets `Content-Type: text/markdown` and triggers a file download.
 *     tags: [Tables]
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [w3c, rdf, csv, raw, report_md]
 *           default: w3c
 *       - in: query
 *         name: keepMatching
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Include only reconciliated cells with a match
 *     responses:
 *       200:
 *         description: Exported data in the requested format
 *   post:
 *     summary: Export a table (POST variant — supports larger body params)
 *     tags: [Tables]
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [w3c, rdf, csv, raw, report_md]
 *               keepMatching:
 *                 type: boolean
 *               htmlContent:
 *                 type: string
 *                 description: HTML string used by the report_md exporter
 *     responses:
 *       200:
 *         description: Exported data
 */
router.get(
  "/:idDataset/table/:idTable/export",
  asyncMiddleware(DatasetsController.exportTable),
);
router.post(
  "/:idDataset/table/:idTable/export",
  asyncMiddleware(DatasetsController.exportTable),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/code:
 *   get:
 *     summary: Export table annotation code (Python script or Jupyter notebook)
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [python, notebook]
 *           default: python
 *     responses:
 *       200:
 *         description: File download (`.py` or `.ipynb`)
 *         content:
 *           text/x-python:
 *             schema:
 *               type: string
 *               format: binary
 *           application/x-ipynb+json:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table/:idTable/code",
  asyncMiddleware(DatasetsController.exportTableCode),
);

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/compliance:
 *   post:
 *     summary: Start a GDPR compliance check for a table
 *     description: >
 *       Kicks off an async compliance analysis. Returns immediately with status `PENDING`.
 *       The final result is delivered via the `compliance-done` WebSocket event.
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purpose:
 *                 type: string
 *                 description: Data processing purpose (defaults to "General data processing")
 *                 example: Marketing analytics
 *     responses:
 *       200:
 *         description: Analysis started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datasetId:
 *                   type: string
 *                 tableId:
 *                   type: string
 *                 complianceStatus:
 *                   type: string
 *                   example: PENDING
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/table/:idTable/compliance",
  asyncMiddleware(DatasetsController.makeCompliance),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/compliance/{reportIndex}:
 *   get:
 *     summary: Download a compliance report
 *     description: >
 *       Use `reportIndex` = `latest` for the most recent report, or an integer index.
 *       Add `?format=md` to receive a Markdown file instead of JSON.
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - in: path
 *         name: reportIndex
 *         required: true
 *         schema:
 *           type: string
 *         description: Zero-based index of the report, or `latest`
 *         example: latest
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [json, md]
 *           default: json
 *     responses:
 *       200:
 *         description: Report file download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/markdown:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get(
  "/:idDataset/table/:idTable/compliance/:reportIndex",
  asyncMiddleware(DatasetsController.downloadComplianceReport),
);

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/operation/{opId}/downstream:
 *   get:
 *     summary: Get downstream dependencies of an operation
 *     description: Returns all operation IDs that depend on the given operation (would be invalidated if it were deleted).
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - $ref: '#/components/parameters/opId'
 *     responses:
 *       200:
 *         description: Downstream dependency list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 opId:
 *                   type: string
 *                 downstreamDeps:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table/:idTable/operation/:opId/downstream",
  asyncMiddleware(DatasetsController.getOperationDownstreamDeps),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/operation/{opId}/redo:
 *   post:
 *     summary: Re-run a reconciliation operation from the log
 *     description: >
 *       Rebuilds the item list from current table data and re-calls the same reconciliation
 *       service with the same parameters. The new operation is appended to the log.
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - $ref: '#/components/parameters/opId'
 *     responses:
 *       200:
 *         description: Reconciliation result with updated dependency graph
 *       400:
 *         description: Operation is not a reconciliation or missing service ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Operation or column not found
 *       423:
 *         description: Table locked by another user
 */
router.post(
  "/:idDataset/table/:idTable/operation/:opId/redo",
  asyncMiddleware(DatasetsController.redoOperation),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/operation/{opId}:
 *   delete:
 *     summary: Delete an operation and all its downstream dependents
 *     description: >
 *       Removes the operation and everything that depends on it from the log,
 *       then automatically re-runs the last surviving reconciliation on any
 *       affected columns so the table stays consistent.
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *       - $ref: '#/components/parameters/opId'
 *     responses:
 *       200:
 *         description: Deleted IDs, re-reconciliation results, and updated dependency graph
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: array
 *                   items:
 *                     type: string
 *                 reconResults:
 *                   type: array
 *                   items:
 *                     type: object
 *                 dependencies:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       423:
 *         description: Table locked by another user
 */
router.delete(
  "/:idDataset/table/:idTable/operation/:opId",
  asyncMiddleware(DatasetsController.deleteOperation),
);

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /track/{idDataset}/{idTable}:
 *   post:
 *     summary: Log a client-side operation (e.g. type propagation)
 *     description: >
 *       Used by the frontend to record operations that happen locally without
 *       a full server round-trip. Currently only supports `PROPAGATE_TYPE`.
 *     tags: [Operations]
 *     parameters:
 *       - in: path
 *         name: idDataset
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: idTable
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operationType]
 *             properties:
 *               operationType:
 *                 type: string
 *                 example: PROPAGATE_TYPE
 *               columnName:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Tracked successfully
 */
router.post(
  "/track/:idDataset/:idTable",
  asyncMiddleware(DatasetsController.trackTable),
);

// ---------------------------------------------------------------------------
// Dataset ACL
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset/{idDataset}/acl/viewers:
 *   post:
 *     summary: Add a viewer to a dataset
 *     tags: [Dataset ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated dataset ACL
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Remove a viewer from a dataset
 *     tags: [Dataset ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated dataset ACL
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/acl/viewers",
  asyncMiddleware(DatasetsController.addViewer),
);
router.delete(
  "/:idDataset/acl/viewers",
  asyncMiddleware(DatasetsController.removeViewer),
);

/**
 * @swagger
/dataset/{idDataset}/acl/editors:
 *   post:
 *     summary: Add an editor to a dataset
 *     tags: [Dataset ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated dataset ACL
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Remove an editor from a dataset
 *     tags: [Dataset ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated dataset ACL
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/acl/editors",
  asyncMiddleware(DatasetsController.addEditor),
);
router.delete(
  "/:idDataset/acl/editors",
  asyncMiddleware(DatasetsController.removeEditor),
);

/**
 * @swagger
/dataset/{idDataset}/acl/visibility:
 *   post:
 *     summary: Set dataset visibility
 *     tags: [Dataset ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visibility]
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *     responses:
 *       200:
 *         description: Updated dataset
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/acl/visibility",
  asyncMiddleware(DatasetsController.setVisibility),
);

// ---------------------------------------------------------------------------
// Table ACL
// ---------------------------------------------------------------------------

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/acl:
 *   get:
 *     summary: Get table ACL (viewers, editors, visibility)
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     responses:
 *       200:
 *         description: Table ACL object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 idDataset:
 *                   type: string
 *                 name:
 *                   type: string
 *                 visibility:
 *                   type: string
 *                   nullable: true
 *                 viewers:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 editors:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 datasetOwnerId:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:idDataset/table/:idTable/acl",
  asyncMiddleware(DatasetsController.getTableAcl),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/acl/viewers:
 *   post:
 *     summary: Add a viewer to a table
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated table ACL
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Remove a viewer from a table
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated table ACL
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/table/:idTable/acl/viewers",
  asyncMiddleware(DatasetsController.addTableViewer),
);
router.delete(
  "/:idDataset/table/:idTable/acl/viewers",
  asyncMiddleware(DatasetsController.removeTableViewer),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/acl/editors:
 *   post:
 *     summary: Add an editor to a table
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated table ACL
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Remove an editor from a table
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated table ACL
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/table/:idTable/acl/editors",
  asyncMiddleware(DatasetsController.addTableEditor),
);
router.delete(
  "/:idDataset/table/:idTable/acl/editors",
  asyncMiddleware(DatasetsController.removeTableEditor),
);

/**
 * @swagger
/dataset/{idDataset}/table/{idTable}/acl/visibility:
 *   post:
 *     summary: Set table-level visibility
 *     tags: [Table ACL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idDataset'
 *       - $ref: '#/components/parameters/idTable'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visibility]
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *     responses:
 *       200:
 *         description: Updated table metadata
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:idDataset/table/:idTable/acl/visibility",
  asyncMiddleware(DatasetsController.setTableVisibility),
);

// ---------------------------------------------------------------------------
// Table Locks
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /lock/{tableId}/acquire:
 *   post:
 *     summary: Acquire an edit lock on a table
 *     description: >
 *       Grants the requesting user an exclusive in-memory lock on the table.
 *       If the lock is already held by another user, returns `acquired: false`.
 *       A `table-lock-acquired` or `table-lock-denied` WebSocket event is broadcast.
 *     tags: [Table Locks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lock result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 acquired:
 *                   type: boolean
 *                 lockedBy:
 *                   type: integer
 *                   nullable: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/lock/:tableId/acquire",
  asyncMiddleware(DatasetsController.acquireTableLock),
);

/**
 * @swagger
 * /lock/{tableId}/release:
 *   post:
 *     summary: Release the edit lock on a table
 *     description: >
 *       Only the user who holds the lock can release it.
 *       A `table-lock-released` WebSocket event is broadcast on success.
 *     tags: [Table Locks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Release result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 released:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/lock/:tableId/release",
  asyncMiddleware(DatasetsController.releaseTableLock),
);

/**
 * @swagger
 * /lock/{tableId}/force-release:
 *   post:
 *     summary: Force-release a table lock (owner only)
 *     description: >
 *       Only the dataset owner can force-release a lock held by another user.
 *       A `table-lock-force-released` WebSocket event is broadcast on success.
 *     tags: [Table Locks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Force-release result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 released:
 *                   type: boolean
 *                 wasOwnedBy:
 *                   type: integer
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only dataset owner can force-release locks
 *       404:
 *         description: Table not found
 */
router.post(
  "/lock/:tableId/force-release",
  asyncMiddleware(DatasetsController.forceReleaseTableLock),
);

export default router;
