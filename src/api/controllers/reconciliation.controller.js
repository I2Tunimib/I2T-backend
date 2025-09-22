import axios from "axios";
// import CONFIG from '../../config/index';
import reconciliationPipeline from "../services/reconciliation/reconciliation-pipeline.js";
import config from "../../config/index.js";
import path from "path";
import MantisService from "../services/reconciliation/mantis.service.js";

const __dirname = path.resolve();

const { reconcilers } = config;

const ReconciliationController = {
  list: async (req, res, next) => {
    res.json(
      Object.keys(reconcilers).map((key) => ({
        id: key,
        ...reconcilers[key].info.public,
      }))
    );
  },
  reconcile: async (req, res, next) => {
    try {
      res.json(await reconciliationPipeline(req.body));
    } catch (err) {
      next(err);
    }
  },
  fullAnnoation: async (req, res, next) => {
    const { idDataset, idTable } = req.params;
    const data = req.body;
    const io = req.app.get("io");

    try {
      const result = await MantisService.annotate(idDataset, idTable, data);
      if (result.status === "Ok") {
        await MantisService.trackAnnotationStatus({
          io,
          idDataset,
          idTable,
        });

        res.json({
          datasetId: idDataset,
          tableId: idTable,
          mantisStatus: "PENDING",
        });
      }
    } catch (err) {
      next(err);
    }

    // try {
    //   // if dataset and table already have mantisId (already uploaded) they are simply returned
    //   const { mantisDatasetId, mantisTableId } = await MantisService.createTable(idDataset, idTable);
    //   // start annotation process
    //   const result = await MantisService.annotate(mantisDatasetId, mantisTableId);

    //   if (result.message == 'accepted') {
    //     // start cronjob to periodically check annotation status for the table
    //     await MantisService.trackAnnotationStatus({
    //       io,
    //       localDatasetId: idDataset,
    //       localTableId: idTable,
    //       mantisDatasetId,
    //       mantisTableId
    //     });
    //     res.json({
    //       datasetId: idDataset,
    //       tableId: idTable,
    //       mantisStatus: 'PENDING'
    //     });
    //   } else {
    //     next({ msg: 'Failed to add annotation task to queue' })
    //   }
    // } catch (err) {
    //   next(err)
    // }
  },
  lamapi: async (req, res, next) => {
    const items = req.body.items;
    const response = {
      name: req.body.name,
      items: [],
    };
    // for each item of a column
    for (const item of items) {
      try {
        // get candidate entities from LamAPI (Limit entities to 25)
        const lamRes = await axios.get(
          `${CONFIG.LAMAPI_BASE}/labels?name=${item.label}&limit=25&token=${CONFIG.LAMAPI_TOKEN}`
        );
        if (lamRes.data) {
          response.items.push({
            column: item.column,
            index: item.index,
            label: item.label,
            metadata: lamRes.data.q0.result,
          });
        }
      } catch (err) {
        res.json({ error: err });
        return;
      }
    }

    res.json(response);
  },
};

export default ReconciliationController;
