import CONFIG from "../../config";
import axios from "axios";

const { CHALLENGE_TABLES_BACKEND } = CONFIG;

const ChallengeService = {
  findAllDatasets: async () => {
    const result = await axios.get(`${CHALLENGE_TABLES_BACKEND}/datasets`);
    return result.data;
  }
};

export default ChallengeService;
