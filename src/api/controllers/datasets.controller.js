import DatasetsService from '../services/datasets/datasets.service';
import ExportService from '../services/export/export.service';
import jwt from 'jsonwebtoken';
import config from '../../config/index';
import AuthService from '../services/auth/auth.service';

const {
  JWT_SECRET,
  helpers: { getTo }
} = config

const DatasetsController = {
  getAllDatasets: async (req, res, next) => {
    try {
      const user = AuthService.verifyToken(req);

      res.json(await DatasetsService.findDatasetsByUser(user.id));
    } catch (err) {
      next(err);
    }
  },
  getOneDataset: async (req, res, next) => {
    const { idDataset } = req.params

    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json({});
      }

      res.json(await DatasetsService.findOneDataset(idDataset));
    } catch (err) {
      next(err);
    }
  },
  getAllTablesByDataset: async (req, res, next) => {
    const { idDataset } = req.params
    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json([]);
      }

      res.json(await DatasetsService.findAllTablesByDataset(idDataset));
    } catch (err) {
      next(err);
    }
  },
  getTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params
    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json({});
      }

      res.json(await DatasetsService.findTable(idDataset, idTable));
    } catch (err) {
      next(err);
    }
  },
  addDataset: async (req, res, next) => {
    const { file } = req.files;
    const { name } = req.body;
    try {
      const user = AuthService.verifyToken(req);

      const { datasets } = await DatasetsService.addDataset(file.tempFilePath, name, user.id);

      res.json({
        datasets: Object.keys(datasets).map((key) => datasets[key])
      })
    } catch (err) {
      next(err)
    }
  },
  removeDataset: async (req, res, next) => {
    const { idDataset } = req.params;
    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json({});
      }

      await DatasetsService.removeDataset(idDataset);

      res.status(200).end()
    } catch (err) {
      next(err)
    }
  },
  addTable: async (req, res, next) => {
    const { file } = req.files;
    const { name } = req.body;
    const { idDataset } = req.params;

    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json({});
      }

      const tables = await DatasetsService.addTable(idDataset, file.tempFilePath, name);

      res.json({
        tables: Object.keys(tables).map((key) => {
          const { nCells, nCellsReconciliated, ...rest } = tables[key];
          return {
            ...rest,
            completion: {
              total: nCells,
              value: nCellsReconciliated
            }
          }
        })
      })
    } catch (err) {
      next(err)
    }
  },
  removeTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    try {
      const user = AuthService.verifyToken(req);
      const dataset = await DatasetsService.findOneDataset(idDataset);

      if (dataset.userId !== user.id) {
        return res.status(401).json({});
      }

      await DatasetsService.removeTable(idDataset, idTable);

      res.status(200).end()
    } catch (err) {
      next(err)
    }
  },
  updateTable: async (req, res, next) => {
    const data = req.body;
    try {
      res.json(await DatasetsService.updateTable(data));
    } catch (err) {
      next(err)
    }
  },
  exportTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params
    const { format = 'w3c', keepMatching = false } = req.query
    try {
      const table = await DatasetsService.findTable(idDataset, idTable)
      const data = await ExportService[format]({ ...table, keepMatching });
      res.send(data);
    } catch (err) {
      next(err)
    }
  },
  search: async (req, res, next) => {
    const { query } = req.query;
    try {
      const user = AuthService.verifyToken(req);

      const tables = await DatasetsService.findTablesByNameAndUser(query, user.id);
      const datasets = await DatasetsService.findDatasetsByNameAndUser(query, user.id);

      res.json({
        tables: tables.slice(0, 5),
        datasets: datasets.slice(0, 5)
      })
    } catch (err) {
      next(err)
    }
  }
}

export default DatasetsController;
