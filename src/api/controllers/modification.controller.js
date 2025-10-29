import modificationPipeline from "../services/modification/modification-pipeline.js";
import config from '../../config/index.js';

const { modifiers } = config;

const ModificationController = {
  list: async (req, res, next) => {
    res.json(Object.keys(modifiers).map((key) => ({ id: key, ...modifiers[key].info.public })))
  },
  modify: async (req, res, next) => {
    try {
      res.json(await modificationPipeline(req.body))
    } catch (err) {
      next(err);
    }
  }
}

export default ModificationController;
