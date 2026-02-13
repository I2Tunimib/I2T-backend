import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;
const { access_token } = config.private;

function getAddressFormat(items) {
  return { address: items };
}

export default async (req) => {
  const addressList = [];
  const labelDict = {};
  let error = null;
  const { errors } = req.config;
  const { items } = req.processed;
  try {
    Object.keys(items).forEach((item) => {
      let indice = req.processed.items[item][0].split("$")[0];
      let newItem = item;
      // console.log(`*** geonames request *** indice: ${indice}`);
      // console.log(`item: ${item}`);

      // console.log(`additionalColumns: ${JSON.stringify(req.original.props.additionalColumns)}`);
      if (req.original.props.additionalColumns !== undefined) {
        for (const [key, value] of Object.entries(
          req.original.props.additionalColumns,
        )) {
          if (req.original.props.additionalColumns[key][indice] !== undefined) {
            newItem =
              newItem +
              " " +
              req.original.props.additionalColumns[key][indice][0];
          }
        }
      }
      if (newItem.length > 1 && newItem !== "null" && newItem !== undefined) {
        labelDict[item] = newItem;
        addressList.push(getAddressFormat(newItem));
      }
    });

    try {
      const res = await axios.post(endpoint + "?token=" + access_token, {
        json: addressList.slice(1),
      });
      return {
        result: res.data.result,
        labelDict: labelDict,
        error,
      };
    } catch (axiosErr) {
      console.error("HERE error", axiosErr);
      error = errors.reconciler["01"];
      return {
        result: [],
        labelDict: labelDict,
        error,
      };
    }
  } catch (procErr) {
    error = errors.reconciler["02"];
    return {
      result: [],
      labelDict: labelDict,
      error,
    };
  }
};
