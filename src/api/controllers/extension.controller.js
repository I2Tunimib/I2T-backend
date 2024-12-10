import extensionPipeline from "../services/extension/extension-pipeline.js";
import config from '../../config/index.js';

const { extenders } = config;

const ExtensionController = {
  list: async (req, res, next) => {
    res.json(Object.keys(extenders).map((key) => ({ id: key, ...extenders[key].info.public })))
  },
  extend: async (req, res, next) => {
    try {
      res.json(await extensionPipeline(req.body))
    } catch (err) {
      next(err);
    }
  }
}

export default ExtensionController;
