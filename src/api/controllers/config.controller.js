import config from "../../config/index.js";

const { extenders: extConfig, reconcilers: reconConfig, modifiers: modConfig } = config;

const getPublicConfiguration = (services) => {
  return Object.keys(services).map((key) => ({
    id: key,
    ...services[key].info.public,
  }));
};

const ConfigController = {
  /**
   * Get app configuration.
   */
  getConfig: async (req, res, next) => {
    const reconcilers = getPublicConfiguration(reconConfig);
    const extenders = getPublicConfiguration(extConfig);
    const modifiers = getPublicConfiguration(modConfig);

    try {
      res.json({
        reconcilers,
        extenders,
        modifiers,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default ConfigController;
