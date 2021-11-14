import config from '../config/index';

const { extenders: extConfig, reconciliators: reconConfig } = config;

const getPublicConfiguration = (services) => {
  return Object.keys(services).map((key) => ({ id: key, ...services[key].info.public }))
}

const ConfigController = {
  /**
   * Get app configuration.
   */
  getConfig: async (req, res, next) => {
    const reconciliators = getPublicConfiguration(reconConfig);
    const extenders = getPublicConfiguration(extConfig);

    try {
      res.json({
        reconciliators,
        extenders
      });
    } catch (err) {
      next(err);
    }
  }
}

export default ConfigController;
