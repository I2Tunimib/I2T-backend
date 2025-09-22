import config from "./index.js";
import axios, { all } from "axios";
import fs from "fs";

const { endpoint } = config.private;
const { access_token } = config.private;

function getAddressFormat(items) {
  return { location: items };
}

export default async (req) => {
  const locationList = [];
  const labelDict = {};

  // fs.writeFile('../../fileSemTUI/request-geonames.json', JSON.stringify(req), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/request-geonames.json saved!');
  // });

  const { items } = req.processed;
  const requests = [];
  const { items: allItems } = req.original;
  allItems.forEach((item, index) => {
    if (index === 0) {
      return;
    }
    let indice = item.id.split("$")[0];
    let itemString = item.label;
    if (req.original.props.additionalColumns !== undefined) {
      for (const [key, value] of Object.entries(
        req.original.props.additionalColumns
      )) {
        if (req.original.props.additionalColumns[key][indice] !== undefined) {
          itemString =
            itemString +
            " " +
            req.original.props.additionalColumns[key][indice][0];
        }
      }
    }
    if (
      itemString.length > 1 &&
      itemString !== null &&
      itemString !== undefined
    ) {
      labelDict[item.label] = itemString;
      locationList.push(getAddressFormat(itemString));
    }
  });

  // Object.keys(items).forEach((item) => {
  //   let indice = req.processed.items[item][0].split("$")[0];
  //   // console.log(`*** geonames request *** indice: ${indice}`);
  //   let newItem = item;
  //   if (req.original.props.additionalColumns !== undefined) {
  //     for (const [key, value] of Object.entries(
  //       req.original.props.additionalColumns
  //     )) {
  //       // console.log("test", req.original.props.additionalColumns[key][indice]);
  //       if (req.original.props.additionalColumns[key][indice] !== undefined) {
  //         newItem =
  //           newItem +
  //           " " +
  //           req.original.props.additionalColumns[key][indice][0];
  //       }
  //     }
  //   }
  //   if (
  //     req.original.props.secondPart !== undefined &&
  //     req.original.props.secondPart[indice] !== undefined
  //   ) {
  //     newItem = newItem + " " + req.original.props.secondPart[indice][0];
  //   }
  //   if (
  //     req.original.props.thirdPart !== undefined &&
  //     req.original.props.thirdPart[indice] !== undefined
  //   ) {
  //     newItem = newItem + " " + req.original.props.thirdPart[indice][0];
  //   }
  //   if (
  //     req.original.props.fourthPart !== undefined &&
  //     req.original.props.fourthPart[indice] !== undefined
  //   ) {
  //     newItem = newItem + " " + req.original.props.fourthPart[indice][0];
  //   }
  //   if (newItem.length > 1 && newItem !== "null" && newItem !== undefined) {
  //     labelDict[item] = newItem;
  //     locationList.push(getAddressFormat(newItem));
  //   }
  // });

  // console.log(`*** geonames request *** addressList: ${JSON.stringify(locationList)}`);
  // console.log("locationList", locationList);
  // Create an array of promises for each request
  locationList.forEach((location) => {
    const url =
      endpoint +
      "/searchJSON?maxRows=3&style=full&username=" +
      access_token +
      "&q=" +
      location.location;
    // console.log(`*** geonames request *** url: ${url}`);
    requests.push(axios.get(url));
  });
  // Execute all requests concurrently
  const responses = await Promise.all(requests);
  // Collect all results in 'res'
  const res = responses.map((response) => response.data);
  // console.log("responses", JSON.stringify(res));

  const filteredData = res.map((entry) => {
    return entry.geonames.map((item) => ({
      geonameId: item.geonameId,
      name: item.name,
      countryName: item.countryName,
      fcode: item.fcode,
      fcodeName: item.fcodeName,
      lat: item.lat,
      lng: item.lng,
      score: item.score,
      adminName1: item.adminName1,
    }));
  });

  // fs.writeFile('../../fileSemTUI/filteredData.json', JSON.stringify(filteredData), function (err) {
  //   if (err) throw err;
  //   console.log('File ../../fileSemTUI/filteredData.json saved!');
  // });

  return {
    result: filteredData,
    labelDict: labelDict,
  };
};
