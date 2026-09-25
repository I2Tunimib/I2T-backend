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
        } else {
          throw new Error(
            `Error: Invalid identifiers. ${colId} is not reconcilied with Wikidata identifiers. Please reconcile the column with a Wikidata reconciler service.`,
          );
        }
        return acc;
      }, []);

      const res = await axios.get(`${endpoint}${ids.join("|")}`, {
        headers: {
          "User-Agent":
            "I2T-backend/1.0 (Educational project; https://github.com/your-repo) axios/1.8.3",
        },
      });

      const entities = res.data?.entities || {};
      const subIds = [];

      Object.keys(entities).forEach((entityId) => {
        const tzClaims = entities[entityId]?.claims?.P421;
        if (tzClaims && tzClaims.length > 0) {
          const subId = tzClaims[0].mainsnak?.datavalue?.value?.id;
          if (subId) subIds.push(subId);
        }
      });

      if (subIds.length > 0) {
        const resLabelTz = await axios.get(`${endpoint}${subIds.join("|")}`, {
          params: {
            props: "labels",
            languages: "en"
          },
          headers: {
            "User-Agent":
              "I2T-backend/1.0 (Educational project; https://github.com/your-repo) axios/1.8.3",
          },
        });

        if (resLabelTz.data?.entities) {
          Object.assign(entities, resLabelTz.data.entities);
        }
      }

      return {
        res: { entities }
      };
    }),
  );
};
