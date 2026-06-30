import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import datasetAccessMiddleware from "../middleware/dataset-access.middleware.js";
import ReconciliationController from "../controllers/reconciliation.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Reconciliation
 *     description: >
 *       Column reconciliation against external KGs. Routes are available under
 *       both `/reconcilers` and `/full-annotation` (identical behaviour).
 *       When the `X-Table-Dataset-Info` header is provided the response is
 *       automatically augmented with an updated `dependencies` object.
 */

// ---------------------------------------------------------------------------
// /reconcilers  (and alias /full-annotation — same handlers, same docs)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /reconcilers/list:
 *   get:
 *     summary: List available reconciliation services
 *     tags: [Reconciliation]
 *     responses:
 *       200:
 *         description: Array of reconciler descriptors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceDescriptor'
 */

/**
 * @swagger
 * /full-annotation/list:
 *   get:
 *     summary: List available reconciliation services (full-annotation alias)
 *     tags: [Reconciliation]
 *     responses:
 *       200:
 *         description: Array of reconciler descriptors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceDescriptor'
 */
router.get("/list", asyncMiddleware(ReconciliationController.list));

/**
 * @swagger
 * /reconcilers/automatic/dataset/{idDataset}/table/{idTable}:
 *   post:
 *     summary: Start automatic full-table or schema annotation
 *     description: >
 *       Dispatches to **Mantis** (full-table, method `alligator`) or the
 *       **LLM column classifier** (schema, method `llmClassifier`/`llm`).
 *       Returns immediately with a `PENDING` status; the result arrives via
 *       the `done` or `schema-done` WebSocket event.
 *       Requires edit access to the dataset (`datasetId` in body or
 *       `X-Table-Dataset-Info` header).
 *     tags: [Reconciliation]
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
 *             required: [target, method]
 *             properties:
 *               target:
 *                 type: string
 *                 enum: [fullTable, schema]
 *                 description: Scope of the annotation
 *               method:
 *                 type: string
 *                 enum: [alligator, llmClassifier, llmColumnClassifier, llm]
 *                 description: Annotation strategy
 *               useLLM:
 *                 type: boolean
 *                 description: Enable LLM post-processing for Mantis (fullTable only)
 *     responses:
 *       200:
 *         description: Job accepted, processing in background
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Mantis job
 *                   properties:
 *                     datasetId:
 *                       type: string
 *                     tableId:
 *                       type: string
 *                     mantisStatus:
 *                       type: string
 *                       example: PENDING
 *                 - type: object
 *                   description: LLM schema job
 *                   properties:
 *                     datasetId:
 *                       type: string
 *                     tableId:
 *                       type: string
 *                     schemaStatus:
 *                       type: string
 *                       example: PENDING
 *       400:
 *         description: Unsupported annotation type combination
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /full-annotation/automatic/dataset/{idDataset}/table/{idTable}:
 *   post:
 *     summary: Start automatic annotation (full-annotation alias)
 *     tags: [Reconciliation]
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
 *             $ref: '#/components/schemas/AutomaticAnnotationRequest'
 *     responses:
 *       200:
 *         description: Job accepted
 *       400:
 *         description: Unsupported annotation type
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/automatic/dataset/:idDataset/table/:idTable",
  datasetAccessMiddleware,
  asyncMiddleware(ReconciliationController.automaticAnnotation),
);

/**
 * @swagger
 * /reconcilers/{serviceId}:
 *   post:
 *     summary: Reconcile a column against a KG service
 *     description: >
 *       Sends `items` through the named reconciler's request/response
 *       transformer pipeline. The URL path segment `{serviceId}` is
 *       informational; the actual dispatch key is `serviceId` in the request
 *       body.
 *
 *       **Auth & ACL:** optional. If `datasetId` is provided in the body
 *       or via `X-Table-Dataset-Info`, the user must have edit access.
 *
 *       **Dependencies:** when `X-Table-Dataset-Info` is present, the response
 *       is automatically enriched with a `dependencies` object reflecting the
 *       updated operation graph.
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reconciler ID (must match a configured reconciler key)
 *         example: lamapi
 *       - in: header
 *         name: X-Table-Dataset-Info
 *         required: false
 *         schema:
 *           type: string
 *         description: "Format: `tableId:<id>;datasetId:<id>[;columnName:<name>]`"
 *         example: "tableId:abc123;datasetId:xyz456;columnName:City"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReconciliationRequest'
 *     responses:
 *       200:
 *         description: >
 *           Service-specific reconciliation result. Includes `dependencies`
 *           when `X-Table-Dataset-Info` header was provided.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationResponse'
 *       401:
 *         description: Unauthorized — dataset requires edit access
 *       500:
 *         description: Service not found or pipeline error
 */

/**
 * @swagger
 * /full-annotation/{serviceId}:
 *   post:
 *     summary: Reconcile a column (full-annotation alias)
 *     tags: [Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         example: lamapi
 *       - in: header
 *         name: X-Table-Dataset-Info
 *         required: false
 *         schema:
 *           type: string
 *         example: "tableId:abc123;datasetId:xyz456;columnName:City"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReconciliationRequest'
 *     responses:
 *       200:
 *         description: Reconciliation result (with `dependencies` when header present)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Pipeline error
 */
router.post(
  "/*",
  datasetAccessMiddleware,
  asyncMiddleware(ReconciliationController.reconcile),
);

export default router;
