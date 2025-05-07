import config from './index.js';
import fs from "fs";

const { uri } = config.public;

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function cleanLabel(label){
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, '');
}


export default async (req, res) => {

  const { items } = req.processed;
  // console.log('*** res: ' + JSON.stringify(res));
  // fs.writeFile('../../fileSemTUI/response-OpenRefine.json', JSON.stringify(res), function (err) {
  //    if (err) throw err;
  //     console.log('File ../../fileSemTUI/response-OpenRefine.json saved!');
  // });
  const response = Object.keys(items).flatMap((label) => {
    const metadata = res[cleanLabel(label)].result.map(({ id, ...rest }) => ({
      id: `wd:${id}`,
      ...rest
    }))

    return items[label].map((cellId) => ({
      id: cellId,
      metadata
    }))
  });

  // const response = Object.keys(res).map((id) => {
  //   const metadata = res[id].result.map(({ features, ...metaItem }) => ({
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

  // fs.writeFile('../../fileSemTUI/responseREC-SemTUI-OpenRefine.json', JSON.stringify(response), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/responseREC-SemTUI-OpenRefine.json saved!');
  // });

  return response;
}
