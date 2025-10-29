import config from "./index.js";
import axios from "axios";

const { endpoint, relativeUrl } = config.private;

async function makeRequest(endpoint, payload, row) {
  const res = await axios.post(endpoint + "/validate", payload);
  res.data["row"] = row;
  return res.data;
}

export default async (req) => {
  const { items } = req.original;

  return Promise.all(
    Object.keys(items).map(async (data) => {
      return Promise.all(
        Object.keys(items[data]).map(async (row) => {
          const company_name = items[data][row].value;
          // Build address object from additionalColumns
          const address = {};

          // Handle additionalColumns from props (object with column names as keys)
          if (
            req.original.props.additionalColumns &&
            typeof req.original.props.additionalColumns === "object"
          ) {
            const additionalColumnKeys = Object.keys(
              req.original.props.additionalColumns,
            );

            additionalColumnKeys.forEach((colId, index) => {
              if (
                req.original.props.additionalColumns[colId] &&
                req.original.props.additionalColumns[colId][row]
              ) {
                const value =
                  req.original.props.additionalColumns[colId][row][0];
                console.log("*** debug value address ***: ", value);
                // Map columns to address fields based on order
                if (index === 0) address.line_1 = value;
                else if (index === 1) address.line_2 = value;
                else if (index === 2) address.postcode = value;
              }
            });
          }

          const payload = { company_name };

          // Only add address if it has at least one field
          if (Object.keys(address).length > 0) {
            payload.address = address;
          }
          let res = await makeRequest(endpoint, payload, row);
          return res;
        }),
      );
    }),
  );
};
