import { error } from "console";
import config from "../../config/index.js";

const {
  extenders: extConfig,
  reconcilers: reconConfig,
  modifiers: modConfig,
  errors,
} = config;

const getPublicConfiguration = (services) => {
  return Object.keys(services).map((key) => {
    const publicConfig = {
      id: key,
      ...services[key].info.public,
    };
    // Log extenders to verify skipFiltering is included
    if (services[key].info.public.name === "CH Matching") {
      console.log(
        "[ConfigController] CH Matching extender config:",
        JSON.stringify(publicConfig, null, 2),
      );
    }
    return publicConfig;
  });
};

const ConfigController = {
  /**
   * Get app configuration.
   */
  getConfig: async (req, res, next) => {
    const reconcilers = getPublicConfiguration(reconConfig);
    const extenders = getPublicConfiguration(extConfig);
    const modifiers = getPublicConfiguration(modConfig);

    console.log(`[ConfigController] Sending config to frontend:`);
    console.log(`  - ${reconcilers.length} reconcilers`);
    console.log(`  - ${extenders.length} extenders`);
    console.log(`  - ${modifiers.length} modifiers`);

    // Find and log CH Matching extender specifically
    const chMatching = extenders.find((e) => e.name === "CH Matching");
    if (chMatching) {
      console.log(`[ConfigController] CH Matching extender being sent:`, {
        id: chMatching.id,
        name: chMatching.name,
        skipFiltering: chMatching.skipFiltering,
        allValues: chMatching.allValues,
      });
    }

    try {
      res.json({
        reconcilers,
        extenders,
        modifiers,
        errors,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default ConfigController;
