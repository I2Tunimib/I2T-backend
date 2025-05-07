import config from "./index.js";
import axios from "axios";
import fs from "fs";

const { endpoint } = config.private; // https://alligator.hel.sintef.cloud
const { access_token } = config.private;
const { relativeUrl } = config.public; // /dataset

export default async (req) => {
  // fs.writeFile('../../fileSemTUI/requestREC-UI-Alligator.json', JSON.stringify(req), function (err) {
  //     if (err) throw err;
  //     console.log('File ../../fileSemTUI/requestREC-UI-Alligator.json saved!');
  // });
  const timestamp = new Date().getTime(); // Get the current timestamp
  const randomId = Math.floor(Math.random() * 1000); // Generate a random number
  const tableName = "SN-BC-" + timestamp + randomId;
  const bodyAlligatorRequestTemplate = [
    {
      datasetName: "EMD-BC",
      tableName: tableName,
      header: [],
      rows: [],
      semanticAnnotations: {
        cea: [],
        cta: [],
        cpa: [],
      },
      metadata: {},
      kgReference: "wikidata",
    },
  ];

  // create the header for the request to alligator
  const header = req.original.items // the column1 to reconcile
    .filter((item) => !item.id.includes("$")) // Filter items without "$" in id
    .map((item) => item.label); // Extract labels
  //   for (const key of ["column2", "column3", "column4"]) {
  //     const part = req.original.props[key];
  //     // console.log(`*** request alligator *** key: ${JSON.stringify(key)}
  //     //  *** part: ${JSON.stringify(part)}
  //     //  *** part && part.hasOwnProperty("r0"): ${part && part.hasOwnProperty("r0")}`);
  //     if (part && part.hasOwnProperty("r0")) {
  //       header.push(part.r0[2]);
  //     }
  //   }
  // Add additionalColumns headers if present
  console.log(
    `*** request alligator *** req.original.props.additionalColumns: ${JSON.stringify(
      req.original.props.additionalColumns
    )}`
  );

  // Handle additionalColumns from props (object with column names as keys)
  if (req.original.props.additionalColumns) {
    // Loop through each column key in the additionalColumns object
    Object.keys(req.original.props.additionalColumns).forEach((colId) => {
      console.log(
        `*** request alligator *** additionalColumns colId: ${colId}`
      );
      // Check if column exists in props and hasn't been added already
      if (
        req.original.props.additionalColumns[colId] &&
        req.original.props.additionalColumns[colId].r0
      ) {
        const columnLabel = req.original.props.additionalColumns[colId].r0[2];
        console.log(
          `*** request alligator *** additionalColumns columnLabel: ${columnLabel}`
        );
        // Avoid duplicating columns that were already added
        if (!header.includes(columnLabel)) {
          header.push(columnLabel);
        }
      }
    });
  }

  // Add multipleColumnSelect headers if present
  console.log(
    `*** request alligator *** req.original.multipleColumnSelect: ${JSON.stringify(
      req.original.multipleColumnSelect
    )}`
  );

  // Handle multipleColumnSelect parameter if present - these are the additional columns to include
  if (
    req.original.props.additionalColumns &&
    Array.isArray(req.original.props.additionalColumns)
  ) {
    req.original.props.additionalColumns.forEach((colId) => {
      console.log(
        `*** request alligator *** multipleColumnSelect colId: ${colId}`
      );
      // Check if column exists in props and hasn't been added already
      if (
        req.original.props.additionalColumns[colId] &&
        req.original.props.additionalColumns[colId].r0
      ) {
        const columnLabel = req.original.props.additionalColumns[colId].r0[2];
        // Avoid duplicating columns already in the header
        if (!header.includes(columnLabel)) {
          header.push(columnLabel);
        }
      }
    });
  }

  console.log(
    `*** request alligator *** header from items and props: ${JSON.stringify(
      header
    )}`
  );
  bodyAlligatorRequestTemplate[0].header = header;

  //create the rows for the request to alligator
  const rows = req.original.items // rows from column 1
    .filter((item) => item.id.includes("$")) // Filter items with "$" in id
    .map((item) => {
      const idMatch = item.id.match(/r(\d+)\$/);
      return {
        idRow: idMatch ? Number(idMatch[1]) + 1 : null, // Extract the number between "r" and "$"
        data: [item.label], // Create an array with the label
      };
    });
  // Modify this part to handle specific columns correctly
  for (const row of rows) {
    const rowIndex = "r" + (row.idRow - 1);

    // Add standard column2/3/4 data
    // for (const key of ["column2", "column3", "column4"]) {
    //   if (req.original.props[key] && req.original.props[key][rowIndex]) {
    //     row.data.push(req.original.props[key][rowIndex][0]);
    //   }
    // }

    // Add data from additionalColumns (which is an object with column names as keys)
    if (
      req.original.props.additionalColumns &&
      typeof req.original.props.additionalColumns === "object"
    ) {
      // Loop through each column key in the additionalColumns object
      Object.keys(req.original.props.additionalColumns).forEach((colId) => {
        // Add the column data if it exists for this row
        if (
          req.original.props.additionalColumns[colId] &&
          req.original.props.additionalColumns[colId][rowIndex]
        ) {
          row.data.push(
            req.original.props.additionalColumns[colId][rowIndex][0]
          );
        }
      });
    }
  }
  //    console.log(`*** request alligator *** rows from items and props: ${JSON.stringify(rows)}`);
  bodyAlligatorRequestTemplate[0].rows = rows;

  // console.log(`*** request alligator *** bodyAlligatorRequestTemplate: ${JSON.stringify(bodyAlligatorRequestTemplate)}`);
  // https://alligator.hel.sintef.cloud/dataset/createWithArray
  const postUrl = endpoint + relativeUrl + "/createWithArray";
  // https://alligator.hel.sintef.cloud/dataset/createWithArray?token=alligator_demo_2023
  console.log(
    `*** request alligator *** postUrl to alligator: ${postUrl}?token=${access_token} *** tableName: ${tableName}`
  );
  // fs.writeFile('../../fileSemTUI/bodyAlligatorRequest.json',
  //     JSON.stringify(bodyAlligatorRequestTemplate), function (err) {
  //     if (err) throw err;
  //     console.log('File ../../fileSemTUI/bodyAlligatorRequest.json saved!');
  // });

  const res = await axios.post(
    postUrl + "?token=" + access_token,
    bodyAlligatorRequestTemplate
  );
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  if (res.status !== 202) {
    console.log(
      `*** request alligator ### ERROR status code returned by alligator is: ${res.status} `
    );
  } else {
    console.log(
      `*** request alligator ### OK status code returned by alligator is: ${res.status} `
    );
    const getUrl = endpoint + relativeUrl + "/EMD-BC/table/" + tableName;
    const itemsPerPage = req.original.items.length;
    console.log(
      `*** request alligator *** getUrl to alligator: ${getUrl}?page=1&per_page=${itemsPerPage}&token=${access_token}`
    );
    let annotation;
    let status = "DOING";
    while (status !== "DONE") {
      await delay(3000);
      annotation = await axios.get(
        `${getUrl}?page=1&per_page=${itemsPerPage}&token=${access_token}`
      );
      status = annotation.data.data.status;
      // console.log(`*** get Alligator: status ${annotation.data.data.status}`);
    }
    // console.log(`*** get Alligator: done`);
    return annotation.data.data;
  }
};
