import { Router } from "express";
import ModificationController from "../controllers/modification.controller.js";
import asyncMiddleware from "../middleware/async.middleware.js";
import datasetAccessMiddleware from "../middleware/dataset-access.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Modification
 *     description: >
 *       Cell and column modifications (label edits, type propagation, etc.).
 *       All routes are under `/modifiers`.
 *       When `X-Table-Dataset-Info` is provided the response is enriched with
 *       an updated `dependencies` object.
 */

/**
 * @swagger
 * /modifiers/list:
 *   get:
 *     summary: List available modification services
 *     tags: [Modification]
 *     responses:
 *       200:
 *         description: Array of modifier descriptors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceDescriptor'
 */
router.get("/list", asyncMiddleware(ModificationController.list));

/**
 * @swagger
 * /modifiers/{serviceId}:
 *   post:
 *     summary: Apply a modification to table cells or columns
 *     description: >
 *       Runs the request through the named modifier's request/response
 *       transformer pipeline. Common modifiers include label editing,
 *       type propagation, and manual entity linking.
 *
 *       **Auth & ACL:** optional. If `datasetId` is resolvable from the body
 *       or `X-Table-Dataset-Info` header the user must have edit access.
 *
 *       **Dependencies:** response is enriched with `dependencies` when
 *       `X-Table-Dataset-Info` is present.
 *     tags: [Modification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modifier ID (must match a configured modifier key)
 *         example: cell-label-edit
 *       - in: header
 *         name: X-Table-Dataset-Info
 *         required: false
 *         schema:
 *           type: string
 *         description: "Format: `tableId:<id>;datasetId:<id>[;columnName:<name>]`"
 *         example: "tableId:abc123;datasetId:xyz456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, items]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: Modifier ID (same as path segment)
 *                 example: cell-label-edit
 *               items:
 *                 type: array
 *                 description: Cells or columns to modify
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Cell ID (`rowId$colId`) or column ID
 *                     label:
 *                       type: string
 *                       description: New label value
 *               tableId:
 *                 type: string
 *               datasetId:
 *                 type: string
 *               columnName:
 *                 type: string
 *     responses:
 *       200:
 *         description: >
 *           Modification result. Includes `dependencies` when
 *           `X-Table-Dataset-Info` header was provided.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: object
 *                   description: Updated row data
 *                 columns:
 *                   type: object
 *                   description: Updated column data (when columns were modified)
 *                 dependencies:
 *                   type: object
 *                   description: Updated operation dependency graph (when header present)
 *       401:
 *         description: Unauthorized — dataset requires edit access
 *       500:
 *         description: Service not found or pipeline error
 */
router.post(
  "/*",
  datasetAccessMiddleware,
  asyncMiddleware(ModificationController.modify),
);

export default router;
