import DatasetsService from "../services/datasets/datasets.service.js";
import ExportService from "../services/export/export.service.js";
import ComplianceService from "../services/tables/compliance.service.js";
import jwt from "jsonwebtoken";
import config from "../../config/index.js";
import AuthService from "../services/auth/auth.service.js";
import fs from "fs";
import LoggerService from "../services/logger/logger.service.js";
import LoggerJsonService from "../services/logger/logger-json.service.js";
import { Log } from "../services/logger/Log.js";

const {
  JWT_SECRET,
  helpers: { getTo },
} = config;

const DatasetsController = {
  getAllDatasets: async (req, res, next) => {
    try {
      const user = await AuthService.verifyToken(req);

      res.json(await DatasetsService.findDatasetsByUser(user.id));
    } catch (err) {
      next(err);
    }
  },
  getOneDataset: async (req, res, next) => {
    const { idDataset } = req.params;

    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanView(dataset, user.id)) {
        return res.status(401).json({});
      }

      res.json(dataset);
    } catch (err) {
      next(err);
    }
  },
  getAllTablesByDataset: async (req, res, next) => {
    const { idDataset } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanView(dataset, user.id)) {
        return res.status(401).json([]);
      }

      res.json(await DatasetsService.findAllTablesByDataset(idDataset));
    } catch (err) {
      next(err);
    }
  },
  getTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    //testing the logger
    const LogFile = new Log(idDataset, idTable);
    LogFile.buildDependencyGraph();
    LogFile.pruneNonConsolidated();
    console.log("Log file json", LogFile);
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanView(dataset, user.id)) {
        return res.status(401).json({});
      }
      const tableData = await DatasetsService.findTable(idDataset, idTable);
      const dump = JSON.stringify(tableData);
      // Write dump to /sample_jsons/get_table_sample.json
      res.json(tableData);
    } catch (err) {
      next(err);
    }
  },
  getDependencies: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanView(dataset, user.id)) {
        return res.status(401).json({});
      }

      const logInstance = new Log(idDataset, idTable);
      logInstance.buildDependencyGraph();
      res.json(logInstance.getObject());
    } catch (err) {
      next(err);
    }
  },
  addDataset: async (req, res, next) => {
    const { file } = req.files || {};
    const { name } = req.body;

    try {
      let user;
      try {
        user = await AuthService.verifyToken(req);
      } catch (authError) {
        return res
          .status(401)
          .json({ error: "Invalid or missing authentication token" });
      }

      if (!user || user.id === null || user.id === undefined) {
        return res.status(401).json({ error: "Invalid user authentication" });
      }

      const { datasets } = await DatasetsService.addDataset(
        file ? file.tempFilePath : null,
        name,
        user.id,
      );

      res.json({
        datasets: Object.keys(datasets).map((key) => datasets[key]),
      });
    } catch (err) {
      next(err);
    }
  },
  removeDataset: async (req, res, next) => {
    const { idDataset } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanEdit(dataset, user.id)) {
        return res.status(401).json({});
      }

      await DatasetsService.removeDataset(idDataset);

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
  addTable: async (req, res, next) => {
    const { file } = req.files;
    const { name } = req.body;
    const { idDataset } = req.params;

    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanEdit(dataset, user.id)) {
        return res.status(401).json({});
      }

      const tables = await DatasetsService.addTable(
        idDataset,
        file.tempFilePath,
        name,
      );

      res.json({
        tables: Object.keys(tables).map((key) => {
          const { nCells, nCellsReconciliated, ...rest } = tables[key];
          return {
            ...rest,
            completion: {
              total: nCells,
              value: nCellsReconciliated,
            },
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
  removeTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanEdit(dataset, user.id)) {
        return res.status(401).json({});
      }

      await DatasetsService.removeTable(idDataset, idTable);

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
  updateTable: async (req, res, next) => {
    const data = req.body;
    // Require auth and edit rights
    try {
      const user = await AuthService.verifyToken(req);
      const tableInstance = data.tableInstance || data.table || null;
      if (!tableInstance || !tableInstance.idDataset) {
        return res
          .status(400)
          .json({ error: "Missing tableInstance or idDataset" });
      }
      const dataset = await DatasetsService.findOneDataset(
        tableInstance.idDataset,
      );
      if (!DatasetsService.userCanEdit(dataset, user.id)) {
        return res.status(401).json({});
      }

      res.json(await DatasetsService.updateTable(data));
    } catch (err) {
      next(err);
    }
  },
  makeCompliance: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    const { purpose } = req.body;
    const io = req.app.get("io");

    try {
      await ComplianceService.startCompliance({
        idDataset,
        idTable,
        purpose: purpose || "General data processing",
        io,
      });

      return res.json({
        datasetId: idDataset,
        tableId: idTable,
        complianceStatus: "PENDING",
      });
    } catch (err) {
      next(err);
    }
  },
  exportTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    let { format = "w3c", keepMatching = false } = req.query;
    console.log("*** export req query values", req.query);
    try {
      const table = await DatasetsService.findTable(idDataset, idTable);
      //workaround to handle different rdf formats
      if (format.startsWith("RDF")) format = "rdf";
      const data = await ExportService[format]({
        ...table,
        keepMatching,
        ...req.query,
      });
      res.send(data);
    } catch (err) {
      next(err);
    }
  },
  exportTableCode: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    const { format = "python" } = req.query;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (!DatasetsService.userCanView(dataset, user.id)) {
        return res.status(401).json({});
      }

      // Table existence isn't checked - we only need the logs
      // The table ID is just used for reference in the generated code
      // Get the exported code file
      const { data, fileName, contentType } = await ExportService.semtParser({
        id: idTable,
        datasetId: idDataset,
        format: format === "notebook" ? "notebook" : "python",
      });

      // Set appropriate headers for file download
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      // Send the file and ensure the response is complete before file cleanup
      res.send(data);
    } catch (err) {
      next(err);
    }
  },
  search: async (req, res, next) => {
    const { query } = req.query;
    try {
      const user = await AuthService.verifyToken(req);

      const tables = await DatasetsService.findTablesByNameAndUser(
        query,
        user.id,
      );
      const datasets = await DatasetsService.findDatasetsByNameAndUser(
        query,
        user.id,
      );

      res.json({
        tables: tables.slice(0, 5),
        datasets: datasets.slice(0, 5),
      });
    } catch (err) {
      next(err);
    }
  },
  getOperationDownstreamDeps: async (req, res, next) => {
    const { idDataset, idTable, opId } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);
      if (!DatasetsService.userCanView(dataset, user.id))
        return res.status(401).json({});

      const log = new Log(idDataset, idTable);
      log.buildDependencyGraph();
      res.json({ opId, downstreamDeps: log.getDownstreamDependencies(opId) });
    } catch (err) {
      next(err);
    }
  },

  deleteOperation: async (req, res, next) => {
    const { idDataset, idTable, opId } = req.params;
    try {
      const user = await AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);
      if (!DatasetsService.userCanEdit(dataset, user.id))
        return res.status(401).json({});

      const log = new Log(idDataset, idTable);
      log.buildDependencyGraph();
      const downstream = log.getDownstreamDependencies(opId);
      log.deleteOperationsFromLog([opId, ...downstream]);
      res.json({ deleted: [opId, ...downstream] });
    } catch (err) {
      next(err);
    }
  },

  // ACL management endpoints
  addViewer: async (req, res, next) => {
    const { idDataset } = req.params;
    const { userId } = req.body;
    try {
      const acting = await AuthService.verifyToken(req);
      const result = await DatasetsService.addViewer(idDataset, userId, acting);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  removeViewer: async (req, res, next) => {
    const { idDataset } = req.params;
    const { userId } = req.body;
    try {
      const acting = await AuthService.verifyToken(req);
      const result = await DatasetsService.removeViewer(
        idDataset,
        userId,
        acting,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  addEditor: async (req, res, next) => {
    const { idDataset } = req.params;
    const { userId } = req.body;
    try {
      const acting = await AuthService.verifyToken(req);
      const result = await DatasetsService.addEditor(idDataset, userId, acting);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  removeEditor: async (req, res, next) => {
    const { idDataset } = req.params;
    const { userId } = req.body;
    try {
      const acting = await AuthService.verifyToken(req);
      const result = await DatasetsService.removeEditor(
        idDataset,
        userId,
        acting,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  setVisibility: async (req, res, next) => {
    const { idDataset } = req.params;
    const { visibility } = req.body;
    try {
      const acting = await AuthService.verifyToken(req);
      const result = await DatasetsService.setVisibility(
        idDataset,
        visibility,
        acting,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  trackTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    const { operationType, columnName, payload } = req.body;
    try {
      switch (operationType) {
        case LoggerService.OPERATION_TYPES.PROPAGATE_TYPE: {
          LoggerService.logTypePropagation(
            idDataset,
            idTable,
            columnName,
            payload,
          );
          LoggerJsonService.logTypePropagation(
            idDataset,
            idTable,
            columnName,
            payload,
          );
          break;
        }
      }

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
};

export default DatasetsController;
