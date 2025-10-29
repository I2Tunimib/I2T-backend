import config from "./index.js";
import fs from "fs";

export default async (req, res) => {
  const { result, labelDict, error } = res;
  // fs.writeFile('../../fileSemTUI/response-geonames-COORD-filtered.json', JSON.stringify(result), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-COORD-filtered.json saved!');
  // });

  const prefix = config.public.prefix;

  // const result = {
  //   geonameId: item.geonameId,
  //   name: item.name,
  //   countryName: item.countryName,
  //   fcode: item.fcode,
  //   fcodeName: item.fcodeName,
  //   lat: item.lat,
  //   lng: item.lng,
  //   score: item.score,
  //   adminName1: item.adminName1
  // }

  const response = req.original.items.map((requestItem, index) => {
    // Get the label from the request item
    const label = requestItem.label;

    // Find the corresponding index in the labelDict entries that matches this label
    const resultIndex = Object.entries(labelDict).findIndex(
      ([key, value]) => key === label,
    );

    // If we found a match, process the metadata, otherwise return empty metadata
    const metadata =
      resultIndex !== -1
        ? result[resultIndex].map((item, i) => {
            return {
              id: `${prefix}:${item.lat},${item.lng}`,
              name: item.name,
              type: [
                {
                  id: item.fcode,
                  name: item.fcodeName,
                },
              ],
              description: "",
              score: item.score,
              match: i === 0 ? true : false,
            };
          })
        : [];

    return {
      id: requestItem.id,
      metadata: metadata,
    };
  });

  const header = {
    id: req.original.items[0].id,
    metadata: [],
  };

  response.splice(0, 1, header);

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

  // fs.writeFile('../../fileSemTUI/response-geonames-COORD-returned-to-UI.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-COORD-returned-to-UI.json saved!');
  // });

  return { ...response, error: res.error };
};
