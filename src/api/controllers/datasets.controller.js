import DatasetsService from '../services/datasets/datasets.service';
import ExportService from '../services/export/export.service';

const DatasetsController = {
  getAllDatasets: async (req, res, next) => {
    try {
      res.json(await DatasetsService.findAllDatasets());
    } catch (err) {
      next(err);
    }
  },
  getOneDataset: async (req, res, next) => {
    const { idDataset } = req.params
    try {
      res.json(await DatasetsService.findOneDataset(idDataset));
    } catch (err) {
      next(err);
    }
  },
  getAllTablesByDataset: async (req, res, next) => {
    const { idDataset } = req.params
    try {
      res.json(await DatasetsService.findAllTablesByDataset(idDataset));
    } catch (err) {
      next(err);
    }
  },
  getTable: async (req, res, next) => {
    const { idDataset, idTable } = req.params
    try {
      res.json(await DatasetsService.findTable(idDataset, idTable));
    } catch (err) {
      next(err);
    }
  },
  addDataset: async (req, res, next) => {
    const { file } = req.files;
    const { name } = req.body;
    try {
      const { datasets } = await DatasetsService.addDataset(file.tempFilePath, name);

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
    console.log(query);
    try {
      const tables = await DatasetsService.findTablesByName(query);
      const datasets = await DatasetsService.findDatasetsByName(query);

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
