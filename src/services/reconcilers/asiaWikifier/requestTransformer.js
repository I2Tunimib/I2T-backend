import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;

export default async (req) => {
  try {
    const { items } = req.processed;

    const queries = Object.keys(items).reduce(
      (acc, label) => ({
        ...acc,
        [label]: { query: encodeURIComponent(label || "") },
      }),
      {},
    );

    const formBody = "queries=" + JSON.stringify(queries);
    const response = await axios.post(`${endpoint}/wikifier`, formBody);
    return { result: response.data, labelDict: {}, error: null };
  } catch (err) {
    console.error("Error in asiaWikifier requestTransformer:", err);
    return {
      result: {},
      labelDict: {},
      error: req.config.errors.reconciler["01"],
    };
  }
};
