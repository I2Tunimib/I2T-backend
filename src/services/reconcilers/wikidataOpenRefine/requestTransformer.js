import config from "./index.js";
import axios from "axios";
import fs from "fs";
import {
  generateReqHash,
  getCachedData,
  setCachedData,
} from "../../../utils/cachingUtils.js";

const { endpoint } = config.private;

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}

function cleanLabel(label) {
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, "");
}

export default async (req) => {
  try {
    // const { items } = req;
    // const queries = items.reduce((acc, { id, label }) => ({
    //   ...acc,
    //   [id]: { query: encodeURIComponent(label || '') }
    // }), {})
    // fs.writeFile('../../fileSemTUI/requestREC-UI-OpenRefine.json', JSON.stringify(req), function (err) {
    //   if (err) throw err;
    //   console.log('File ../../fileSemTUI/requestREC-UI-OpenRefine.json saved!');
    // });

    const { items } = req.processed;
    console.log("Props", req.original.props);
    const { tableId, datasetId, columnName } = req.original.props;
    // console.log(JSON.stringify(items));

    const queries = Object.keys(items).reduce(
      (acc, label) => ({
        ...acc,
        [cleanLabel(label)]: { query: cleanLabel(label) },
      }),
      {},
    );
    let cached = false;
    const reqHash = generateReqHash(req);

    try {
      let cacheRes = await getCachedData(
        `wikidataOpenRefine-${datasetId}-${tableId}-${columnName}-${reqHash}`,
      );
      if (cacheRes) {
        cached = true;
        console.log("cache found");
        return { result: cacheRes.value, labelDict: {}, error: null };
      } else {
        console.log("cache not found");
      }
    } catch (error) {
      console.log("cache not found");
    }
    const formBody = "queries=" + JSON.stringify(queries);
    const response = await axios.post(endpoint, formBody);
    if (response.status !== 200) {
      throw new Error(`Error: ${response.statusText}`);
    }
    try {
      await setCachedData(
        `wikidataOpenRefine-${datasetId}-${tableId}-${columnName}-${reqHash}`,
        response.data,
        60 * 60 * 3600,
      );
    } catch (error) {
      console.error("Error setting cache:", error);
    }

    return { result: response.data, labelDict: {}, error: null };
  } catch (err) {
    console.error("Error in wikidataOpenRefine requestTransformer:", err);
    return {
      result: {},
      labelDict: {},
      error: req.config.errors.reconciler["01"],
    };
  }
};
