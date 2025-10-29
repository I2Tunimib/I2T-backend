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
  // console.log('*** res: ' + JSON.stringify(result));
  // fs.writeFile('../../fileSemTUI/response-OpenRefine.json', JSON.stringify(result), function (err) {
  //    if (err) throw err;
  //     console.log('File ../../fileSemTUI/response-OpenRefine.json saved!');
  // });

  const response = Object.keys(items).flatMap((label) => {
    let cleanL = result[cleanLabel(label)];
    const metadata = result[cleanLabel(label)].result.map(
      ({ id, ...rest }) => ({
        id: `wd:${id}`,
        ...rest,
      }),
    );
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

  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      // For cells, check if any metadata has match
      return item.metadata.some((meta) => meta.match);
    }
    return false;
  });

  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  // fs.writeFile('../../fileSemTUI/responseREC-SemTUI-OpenRefine.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/responseREC-SemTUI-OpenRefine.json saved!');
  // });

  return { ...response, error: res.error };
};
