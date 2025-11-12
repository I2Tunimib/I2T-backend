import config from "./index.js";
import fs from "fs";

const { uri } = config.public;

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}

function cleanLabel(label) {
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, "");
}

export default async (req, res) => {
  const { result, labelDict, error } = res;
  const { items } = req.processed;

  console.log("*** WikidataOpenRefine responseTransformer");
  console.log("*** Items keys:", Object.keys(items));
  console.log("*** Result keys:", Object.keys(result || {}));
  console.log("*** Error from requestTransformer:", error);

  if (error) {
    console.log("There is a base error");
    return { error };
  }

  if (!result) {
    console.error("*** No result from requestTransformer");
    return { error: req.config.errors.reconciler["01"] };
  }

  const response = Object.keys(items).flatMap((label) => {
    const cleanedLabel = cleanLabel(label);
    const resultForLabel = result[cleanedLabel];

    if (!resultForLabel) {
      console.warn(
        `*** No result for label: ${label} (cleaned: ${cleanedLabel})`,
      );
      return items[label].map((cellId) => ({
        id: cellId,
        metadata: [],
      }));
    }

    if (!resultForLabel.result) {
      console.warn(
        `*** No result.result for label: ${label}, got:`,
        resultForLabel,
      );
      return items[label].map((cellId) => ({
        id: cellId,
        metadata: [],
      }));
    }

    const metadata = resultForLabel.result.map(({ id, ...rest }) => ({
      id: `wd:${id}`,
      ...rest,
    }));

    return items[label].map((cellId) => ({
      id: cellId,
      metadata,
    }));
  });

  // const response = Object.keys(result).map((id) => {
  //   const metadata = result[id].result.map(({ features, ...metaItem }) => ({
  //     ...metaItem,
  //     name: {
  //       value: metaItem.name,
  //       uri: `${uri}${metaItem.id}`
  //     }
  //   }));

  //   return {
  //     id,
  //     metadata
  //   };
  // })

  console.log("*** Checking hasResults:");
  console.log("*** Response length:", response.length);
  console.log(
    "*** Sample response item:",
    JSON.stringify(response[0], null, 2),
  );
  if (response[1]?.metadata?.length > 0) {
    console.log(
      "*** Sample metadata:",
      JSON.stringify(response[1].metadata[0], null, 2),
    );
  }

  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      // Check if any metadata exists (don't require match field)
      return true;
    }
    return false;
  });

  console.log("*** hasResults:", hasResults);

  if (!hasResults) {
    console.log("has not results error");
    res.error = req.config.errors.reconciler["02"];
  }

  // fs.writeFile('../../fileSemTUI/responseREC-SemTUI-OpenRefine.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/responseREC-SemTUI-OpenRefine.json saved!');
  // });

  if (res.error) {
    return { error: res.error };
  }
  return response;
};
