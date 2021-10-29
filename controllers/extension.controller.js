import ExtensionService from "../services/extension/extension.service";

const ExtensionController = {
  extendAsiaGeo: async (req, res, next) => {
    try {
      res.json(await ExtensionService.asiaGeo(req.body));
    } catch (err) {
      next(err);
    }
  }
}

export default ExtensionController;
