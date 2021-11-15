import CONFIG from "../../config";
import axios from "axios";
import { createWriteStream } from 'fs';
import { nanoid } from "nanoid";

const { CHALLENGE_TABLES_BACKEND } = CONFIG;

const ChallengeService = {
  findAllDatasets: async () => {
    const result = await axios.get(`${CHALLENGE_TABLES_BACKEND}/datasets`);
    return result.data;
  },
  findTable: async (datasetName, tableName) => {
    const tmpFilePath = `./public/tmp/${nanoid()}.json`;
    const writer = createWriteStream(tmpFilePath)
    const result = await axios.get(`${CHALLENGE_TABLES_BACKEND}/datasets/${datasetName}/tables/${tableName}`, {
      responseType: 'stream'
    });
    result.data.pipe(writer);

    return new Promise((resolve, reject) => {
      result.data.on('end', () => {
        resolve(tmpFilePath)
      });
      result.data.on('error', () => {
        reject()
      });
    })
  }
};

export default ChallengeService;
