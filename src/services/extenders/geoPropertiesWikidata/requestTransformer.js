import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;

export default async (req) => {
  const { items } = req.processed;

  // for each column to extend
  return Promise.all(
    Object.keys(items).map(async (colId) => {
      const columnItems = items[colId];

      const ids = Object.keys(columnItems).reduce((acc, metaId) => {
        const [prefix, id] = metaId.split(":");
        console.log("****** prefix:", prefix);
        if (id.startsWith("Q")) {
          console.log("****** id", id);
          acc.push(id);
        }
        return acc;
      }, []);

      const res = await axios.get(`${endpoint}${ids.join("|")}`, {
        headers: {
          "User-Agent":
            "I2T-backend/1.0 (Educational project; https://github.com/your-repo) axios/1.8.3",
        },
      });

      return {
        res: res.data,
      };
    }),
  );
};
