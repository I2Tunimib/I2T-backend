import AuthService from "../services/auth/auth.service.js";
import DatasetsService from "../services/datasets/datasets.service.js";

const getDatasetIdFromRequest = (req) => {
  if (req.params && req.params.idDataset) {
    return req.params.idDataset;
  }
  if (req.body && req.body.datasetId) {
    return req.body.datasetId;
  }
  if (req.body && req.body.tableInstance && req.body.tableInstance.idDataset) {
    return req.body.tableInstance.idDataset;
  }
  const headerValue = req.headers["x-table-dataset-info"];
  if (typeof headerValue === "string") {
    const pairs = headerValue.split(";").map((part) => part.trim());
    for (const pair of pairs) {
      const [key, value] = pair.split(":");
      if (key === "datasetId" && value) {
        return value.trim();
      }
    }
  }
  return null;
};

const datasetAccessMiddleware = async (req, res, next) => {
  const datasetId = getDatasetIdFromRequest(req);
  if (!datasetId) {
    return next();
  }

  try {
    const user = await AuthService.verifyToken(req);
    const dataset = await DatasetsService.findOneDataset(datasetId);

    if (!DatasetsService.userCanEdit(dataset, user.id)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

export default datasetAccessMiddleware;
