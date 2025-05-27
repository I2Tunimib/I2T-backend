import config from "./index.js";
import fs from "fs";

export default async (req, res) => {
  // fs.writeFile('../../fileSemTUI/response-geonames-filtered.json', JSON.stringify(res), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-filtered.json saved!');
  // });

  const result = res.result;
  const prefix = config.public.prefix;
  const response = result.map((item, index) => {
    const metadata = item.map((subItem, i) => ({
      id: `${prefix}:${subItem.geonameId}`,
      name: subItem.name,
      type: [
        {
          id: subItem.fcode,
          name: subItem.fcodeName,
        },
      ],
      description: "",
      score: subItem.score,
      match: i === 0 ? true : false,
    }));

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

  // fs.writeFile('../../fileSemTUI/response-geonames-returned-to-UI.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-returned-to-UI.json saved!');
  // });

  return response;
};
