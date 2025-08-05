import config from "./index.js";
import axios from "axios";
import { stringify } from "qs";
import fs from "fs";
import { fetchWikidataInformation } from "../../../utils/wikidataUtils.js";

const { endpoint } = config.private;
const allowedPrefixes = ["wd", "wdA"];
export default async (req) => {
  const { items, props } = req.original;

  const itemCol = items[Object.keys(items)[0]];
  const descriptionCol = props.description
    ? Object.keys(props.description).map((key) => props.description[key][0])
    : [];
  const countryCol = props.country
    ? Object.keys(props.country).map((key) => props.country[key][0])
    : [];

  const fullRows = await Promise.all(
    Object.keys(itemCol).map(async (rowId, index) => {
      const wikidataInfo = await fetchWikidataInformation(itemCol[rowId].kbId);
      return {
        ...wikidataInfo,
        name: itemCol[rowId].value ? itemCol[rowId].value : "",
        country: countryCol[index] ? countryCol[index] : "",
        description: descriptionCol[index] ? descriptionCol[index] : "",
        rowId: rowId,
      };
    }),
  );

  console.log("Full rows:", fullRows);

  // Use the row IDs from the item column (assuming all columns have matching row IDs)
  return fullRows;
};
