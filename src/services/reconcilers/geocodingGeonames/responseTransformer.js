import config from "./index.js";
import fs from "fs";

export default async (req, res) => {
  // fs.writeFile('../../fileSemTUI/response-geonames-COORD-filtered.json', JSON.stringify(res), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-COORD-filtered.json saved!');
  // });

  const result = res.result;
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
    const resultIndex = Object.entries(res.labelDict).findIndex(
      ([key, value]) => key === label
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

  // fs.writeFile('../../fileSemTUI/response-geonames-COORD-returned-to-UI.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-COORD-returned-to-UI.json saved!');
  // });

  return response;
};
