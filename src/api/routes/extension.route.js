import { Router } from "express";
import ExtensionController from "../controllers/extension.controller.js";
import asyncMiddleware from "../middleware/async.middleware.js";
import datasetAccessMiddleware from "../middleware/dataset-access.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Extension
 *     description: >
 *       Column extension — adds new columns derived from reconciliated entities.
 *       All routes are under `/extenders`.
 *       When `X-Table-Dataset-Info` is provided the response is enriched with
 *       an updated `dependencies` object.
 */

/**
 * @swagger
 * /extenders/list:
 *   get:
 *     summary: List available extension services
 *     tags: [Extension]
 *     responses:
 *       200:
 *         description: Array of extender descriptors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceDescriptor'
 */
router.get("/list", asyncMiddleware(ExtensionController.list));

/**
 * @swagger
 * /extenders/{serviceId}:
 *   post:
 *     summary: Extend a table with properties from a KG service
 *     description: >
 *       Runs `items` (reconciliated cells with entity IDs) through the named
 *       extender's request/response transformer pipeline to fetch and attach
 *       additional properties as new columns.
 *
 *       **Auth & ACL:** optional. If `datasetId` is resolvable from the body
 *       or `X-Table-Dataset-Info` header the user must have edit access.
 *
 *       **Dependencies:** response is enriched with `dependencies` when
 *       `X-Table-Dataset-Info` is present.
 *     tags: [Extension]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Extender ID (must match a configured extender key)
 *         example: wikidata
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
 *             type: object
 *             required: [serviceId, items]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: Extender ID (same as path segment)
 *                 example: wikidata
 *               items:
 *                 type: array
 *                 description: Reconciliated cells to extend
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Cell ID (`rowId$colId`)
 *                     label:
 *                       type: string
 *                     metadata:
 *                       type: array
 *                       description: Reconciliation candidates (with match scores)
 *                       items:
 *                         type: object
 *               tableId:
 *                 type: string
 *               datasetId:
 *                 type: string
 *               columnName:
 *                 type: string
 *                 description: Source column being extended
 *               properties:
 *                 type: array
 *                 description: KG property IDs to fetch
 *                 items:
 *                   type: string
 *                 example: [P17, P131]
 *     responses:
 *       200:
 *         description: >
 *           Extension result with new column data. Includes `dependencies`
 *           when `X-Table-Dataset-Info` header was provided.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 columns:
 *                   type: object
 *                   description: New column definitions keyed by column ID
 *                 rows:
 *                   type: object
 *                   description: Updated row cells for the new columns
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
  asyncMiddleware(ExtensionController.extend),
);

export default router;
