import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const { relativeUrl } = config.public;

export default async (req) => {
  const bodyCells = req.original.items.filter((item) => item.id.includes("$"));

  if (bodyCells.length === 0) {
    return { result: {}, error: null };
  }

  const results = {};

  await Promise.all(
    bodyCells.map(async (item) => {
      const text = String(item.label ?? "").trim();
      if (!text) {
        results[item.id] = { annotations: {} };
        return;
      }
      try {
        const response = await axios.post(
          `${endpoint}${relativeUrl}`,
          text,
          { headers: { "Content-Type": "text/plain" } },
        );
        results[item.id] = response.data;
      } catch (err) {
        console.error(`textAnnotator: failed for ${item.id}:`, err.message);
        results[item.id] = { annotations: {} };
      }
    }),
  );

  return { result: results, error: null };
};
