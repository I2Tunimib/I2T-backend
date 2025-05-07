import config from './index.js';
import axios from 'axios';
import fs from "fs";

const { endpoint } = config.private;


function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function cleanLabel(label){
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, '');
}

export default async (req) => {
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

 // console.log(JSON.stringify(items));


  const queries = Object.keys(items).reduce((acc, label) => ({
    ...acc,
    [cleanLabel(label)]: { query: cleanLabel(label) }

  }), {});

  const formBody = 'queries=' + JSON.stringify(queries);
  const response = await axios.post(endpoint, formBody)
  return response.data
}
