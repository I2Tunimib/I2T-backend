import extensionPipeline from "../services/extension/extension-pipeline";

const ExtensionController = {
  extend: async (req, res, next) => {
    try {
      res.json(await extensionPipeline(req.body))
    } catch (err) {
      next(err);
    }
  }
}

export default ExtensionController;
