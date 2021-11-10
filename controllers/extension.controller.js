import extensionPipeline from "../services/extension/extension-pipeline";

const ExtensionController = {
  extendWithService: async (req, res, next) => {
    try {
      res.json(await extensionPipeline(req.body))
    } catch (err) {
      next(err);
    }
  }
  // extendAsiaGeo: async (req, res, next) => {
  //   try {
  //     res.json(await ExtensionService.asiaGeo(req.body));
  //   } catch (err) {
  //     next(err);
  //   }
  // },
  // extendAsiaWeather: async (req, res, next) => {
  //   try {
  //     res.json(await ExtensionService.asiaWeather(req.body));
  //   } catch (err) {
  //     next(err);
  //   }
  // }
}

export default ExtensionController;
