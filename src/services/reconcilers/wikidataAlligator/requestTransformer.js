import config from "./index.js";
import axios from "axios";
import fs from "fs";
import {
  generateReqHash,
  getCachedData,
  setCachedData,
} from "../../../utils/cachingUtils.js";

const { endpoint } = config.private; // https://alligator.hel.sintef.cloud
const { access_token } = config.private;
const { relativeUrl } = config.public; // /dataset

export default async (req) => {
  const { tableId, datasetId, columnName } = req.original.props;
  const useLLMMode =
    Array.isArray(req.original.props.useLLM) &&
    req.original.props.useLLM.includes("llm");
  console.log(`*** request alligator *** useLLMMode: ${useLLMMode}`);

  // fs.writeFile('../../fileSemTUI/requestREC-UI-Alligator.json', JSON.stringify(req), function (err) {
  //     if (err) throw err;
  //     console.log('File ../../fileSemTUI/requestREC-UI-Alligator.json saved!');
  // });
  const timestamp = new Date().getTime(); // Get the current timestamp
  const randomId = Math.floor(Math.random() * 1000); // Generate a random number
  const tableName = "SN-BC-" + timestamp + randomId;
  // Give every request its own dataset instead of sharing the caller-supplied
  // datasetId (usually "0"), since DELETE /datasets/{name} on that endpoint
  // wipes ALL tables under the dataset, not just this one.
  const datasetName = "SN-DS-" + timestamp + randomId;
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
      req.original.props.additionalColumns,
    )}`,
  );

  // Handle additionalColumns from props (object with column names as keys)
  if (req.original.props.additionalColumns) {
    // Loop through each column key in the additionalColumns object
    Object.keys(req.original.props.additionalColumns).forEach((colId) => {
      console.log(
        `*** request alligator *** additionalColumns colId: ${colId}`,
      );
      // Check if column exists in props and hasn't been added already
      if (
        req.original.props.additionalColumns[colId] &&
        req.original.props.additionalColumns[colId].r0
      ) {
        const columnLabel = req.original.props.additionalColumns[colId].r0[2];
        console.log(
          `*** request alligator *** additionalColumns columnLabel: ${columnLabel}`,
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
      req.original.multipleColumnSelect,
    )}`,
  );

  // Handle multipleColumnSelect parameter if present - these are the additional columns to include
  if (
    req.original.props.additionalColumns &&
    Array.isArray(req.original.props.additionalColumns)
  ) {
    req.original.props.additionalColumns.forEach((colId) => {
      console.log(
        `*** request alligator *** multipleColumnSelect colId: ${colId}`,
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
      header,
    )}`,
  );
  bodyAlligatorRequestTemplate[0].header = header;

  //create the rows for the request to alligator
  const rows = req.original.items // rows from column 1
    .filter((item) => item.id.includes("$")) // Filter items with "$" in id
    .map((item) => {
      const idMatch = item.id.match(/r(\d+)\$/);
      return {
        idRow: idMatch ? Number(idMatch[1]) : null, // Extract the number between "r" and "$"
        data: [item.label], // Create an array with the label
      };
    });
  // Modify this part to handle specific columns correctly
  for (const row of rows) {
    const rowIndex = "r" + row.idRow;

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
            req.original.props.additionalColumns[colId][rowIndex][0],
          );
        }
      });
    }
  }
  //    console.log(`*** request alligator *** rows from items and props: ${JSON.stringify(rows)}`);

  // Build new API request body: POST /dataset/{datasetName}/table/json
  const newBody = {
    table_name: tableName,
    header: header,
    total_rows: rows.length,
    data: rows.map((row) => {
      const obj = {};
      row.data.forEach((val, i) => {
        obj[header[i]] = val;
      });
      return obj;
    }),
  };

  const postUrl = `${endpoint}/dataset/${datasetName}/table/json`;
  console.log(
    `*** request alligator *** postUrl to alligator: ${postUrl}?token=${access_token} *** tableName: ${tableName} *** datasetName: ${datasetName}`,
  );
  console.log("*** Alligator Body *** ", JSON.stringify(newBody));

  const reqHash = generateReqHash(req);

  let cacheRes;
  try {
    cacheRes = await getCachedData(
      `wikidataAlligator-${datasetId}-${tableId}-${columnName}-${reqHash}`,
    );
  } catch (error) {
    console.log("cache not found");
  }

  if (cacheRes) {
    console.log("cache found");
    return { result: cacheRes.value, labelDict: {}, error: null };
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  try {
    let postStatus;
    let useLegacyApi = false;
    const processorParam = useLLMMode ? "&processor_id=llm-processor" : "";

    // Delete + recreate the dataset so this request always starts from a
    // clean, isolated dataset (datasetName is unique per request, so the
    // delete is normally a no-op 404 and the create is a fresh insert).
    try {
      await axios.delete(`${endpoint}/datasets/${datasetName}`);
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.log(
          `*** request alligator *** dataset delete pre-check failed (non-404): ${err?.response?.status}`,
        );
      }
    }
    try {
      await axios.post(`${endpoint}/datasets`, { dataset_name: datasetName });
    } catch (err) {
      console.log(
        `*** request alligator ### ERROR creating dataset ${datasetName}: ${err?.response?.status} ${JSON.stringify(err?.response?.data)}`,
      );
    }

    try {
      const res = await axios.post(
        `${postUrl}?token=${access_token}${processorParam}`,
        newBody,
      );
      postStatus = res.status;
    } catch (err) {
      const errStatus = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (
        typeof detail === "string" &&
        detail.includes("Table with this name already exists")
      ) {
        // Table already exists — treat as success and proceed to poll
        postStatus = 201;
      } else if (errStatus === 405) {
        // Remote alligator doesn't support new API — fall back to legacy createWithArray
        console.log(
          `*** request alligator *** 405 on new API, falling back to legacy createWithArray`,
        );
        useLegacyApi = true;
        const legacyBody = [
          {
            datasetName: "EMD-BC",
            tableName,
            header,
            rows,
            semanticAnnotations: { cea: [], cta: [], cpa: [] },
            metadata: {},
            kgReference: "wikidata",
          },
        ];
        const legacyRes = await axios.post(
          `${endpoint}${relativeUrl}/createWithArray?token=${access_token}${processorParam}`,
          legacyBody,
        );
        postStatus = legacyRes.status;
      } else {
        throw err;
      }
    }

    if (postStatus !== 201 && postStatus !== 202) {
      console.log(
        `*** request alligator ### ERROR status code returned by alligator is: ${postStatus}`,
      );
    } else {
      console.log(
        `*** request alligator ### OK status code returned by alligator is: ${postStatus} (legacy=${useLegacyApi})`,
      );
      const itemsPerPage = req.original.items.length;

      if (useLegacyApi) {
        // Legacy API: fixed dataset name "EMD-BC", response wrapped in { data: { ... } }
        const getUrl = `${endpoint}${relativeUrl}/EMD-BC/table/${tableName}`;
        let annotation;
        let legacyStatus = "DOING";
        while (legacyStatus !== "DONE") {
          await delay(3000);
          annotation = await axios.get(
            `${getUrl}?page=1&per_page=${itemsPerPage}&token=${access_token}`,
          );
          legacyStatus = annotation.data.data.status;
        }
        annotation.data.data.originalColumns = header;
        return { result: annotation.data.data, labelDict: {}, error: null };
      }

      // New API: try new GET endpoint first, fallback to legacy path on 404
      const getUrls = [
        `${endpoint}/datasets/${datasetName}/tables/${tableName}?token=${access_token}&limit=0`,
        `${endpoint}/dataset/${datasetName}/table/${tableName}?page=1&per_page=${itemsPerPage}&token=${access_token}`,
      ];
      console.log(
        `*** request alligator *** polling urls: ${JSON.stringify(getUrls)}`,
      );

      let annotation;
      let annotationData;
      let annotationStatus = "DOING";
      while (annotationStatus !== "DONE" && annotationStatus !== "FINISHED") {
        await delay(3000);
        for (const getUrl of getUrls) {
          try {
            annotation = await axios.get(getUrl);
            break;
          } catch (err) {
            if (err?.response?.status === 404) continue;
            throw err;
          }
        }
        // Normalize: new API returns flat payload, old API wraps in { data: { ... } }
        annotationData =
          annotation.data && annotation.data.data
            ? annotation.data.data
            : annotation.data;
        annotationStatus = (annotationData.status || "").toUpperCase();
      }
      annotationData.originalColumns = header;
      return { result: annotationData, labelDict: {}, error: null };
    }
  } catch (err) {
    console.error("Error in wikidataAlligator requestTransformer:", err);
    return {
      result: {},
      labelDict: {},
      error: req.config.errors.reconciler["01"],
    };
  }
};
