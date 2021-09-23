import { readFile } from 'fs/promises';
import yaml from 'js-yaml';

const ConfigController = {
  /**
   * Get app configuration.
   */
  getConfig: async (req, res, next) => {
    try {
      const file = await readFile('config.yml', 'utf-8');
      res.json(yaml.load(file));
    } catch (err) {
      next(err);
    }
  }
}

export default ConfigController;
