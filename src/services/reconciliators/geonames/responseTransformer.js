import config from "./index.js";
import fs from "fs";

export default async (req, res) => {
  // fs.writeFile('../../fileSemTUI/response-geonames-filtered.json', JSON.stringify(res), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-filtered.json saved!');
  // });

  const result = res.result;
  const prefix = config.public.prefix;
  let response = [
    {
      id: req.original.items[0].id,
      metadata: [
        {
          id: `${prefix}:Q35120`,
          description:
            "anything that can be considered, discussed, or observed",
          match: true,
          name: "entity",
          score: 1,
          type: [],
          property: [],
        },
      ],
    },
    ...result.map((item, index) => {
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
        id: req.original.items[index + 1].id,
        metadata: metadata,
      };
    }),
  ];

  // const header = {
  //   id: req.original.items[0].id,
  //   metadata: [],
  // };

  // response.splice(0, 1, header);

  // fs.writeFile('../../fileSemTUI/response-geonames-returned-to-UI.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/response-geonames-returned-to-UI.json saved!');
  // });

  return response;
};
