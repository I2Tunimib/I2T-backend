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

  const response = Object.keys(res.labelDict).map((label, index) => {
    const metadata = result[index].map((item, i) => {
      console.log(
        `*** geonames response coord *** item: ${JSON.stringify(item)}`
      );
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
    });

    return {
      id: req.original.items[index].id,
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
