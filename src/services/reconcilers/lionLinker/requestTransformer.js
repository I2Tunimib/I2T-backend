import config from "./index.js";
import axios from "axios";
import {
  generateReqHash,
  getCachedData,
  setCachedData,
} from "../../../utils/cachingUtils.js";

const { endpoint, apiKey } = config.private;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async (req) => {
  try {
    const { tableId, datasetId, columnName } = req.original.props;
    const mainItems = req.original.items.filter((item) =>
      item.id.includes("$"),
    );

    // Build header
    const header = [columnName];
    const rowMap = {};

    // Initialize rows from main items
    mainItems.forEach((item) => {
      const rowMatch = item.id.match(/r(\d+)\$/);
      if (rowMatch) {
        const rowId = parseInt(rowMatch[1]);
        if (!rowMap[rowId]) {
          rowMap[rowId] = { data: [item.label] };
        }
      }
    });

    // Handle additional columns
    if (req.original.props.additionalColumns) {
      Object.keys(req.original.props.additionalColumns).forEach((colId) => {
        const colData = req.original.props.additionalColumns[colId];
        if (colData.r0) {
          header.push(colData.r0[2]); // column label
          // Add data to rows
          Object.keys(colData).forEach((rKey) => {
            const rMatch = rKey.match(/r(\d+)/);
            if (rMatch) {
              const rId = parseInt(rMatch[1]);
              if (rowMap[rId]) {
                rowMap[rId].data.push(colData[rKey][0]); // value
              }
            }
          });
        }
      });
    }

    const rows = Object.keys(rowMap).map((rowId) => ({
      idRow: parseInt(rowId),
      data: rowMap[rowId].data,
    }));

    const datasetName = `Reconciler-${datasetId}`;
    const tableName = `Table-${tableId}`;

    // const lionConfig = {
    //   model_name: process.env.LION_LINKER_MODEL_NAME || "openai/gpt-3.5-turbo",
    //   model_api_provider: "openrouter",
    //   model_api_key: apiKey,
    //   mention_columns: [columnName],
    //   chunk_size: 32,
    //   table_ctx_size: header.length > 1 ? header.length - 1 : 1, // Adjust context size based on additional columns
    //   format_candidates: true,
    //   compact_candidates: true,
    // };
    const lionConfig = {
      model_name: process.env.LLM_MODEL || "openai/gpt-3.5-turbo",
      model_api_provider: "openrouter",
      model_api_key: apiKey,
      model_api_base_url: process.env.LLM_ADDRESS,
      mention_columns: [columnName],
      chunk_size: 32,
      table_ctx_size: 1,
      format_candidates: true,
      compact_candidates: true,
    };

    const retrieverConfig = {
      endpoint:
        process.env.RETRIEVER_ENDPOINT ||
        "https://lamapi.hel.sintef.cloud/lookup/entity-retrieval",
      token: process.env.RETRIEVER_TOKEN || "lamapi_demo_2023",
      num_candidates: 20,
    };

    const payload = [
      {
        datasetName,
        tableName,
        header,
        rows,
        lionConfig,
        retrieverConfig,
      },
    ];

    const reqHash = generateReqHash(req);
    const cacheKey = `lionLinker-${datasetId}-${tableId}-${columnName}-${reqHash}`;

    try {
      let cacheRes = await getCachedData(cacheKey);
      if (cacheRes) {
        console.log("LionLinker cache found");
        return { result: cacheRes.value, labelDict: {}, error: null };
      }
    } catch (error) {
      console.log("LionLinker cache not found");
    }

    // Register dataset
    const registerResp = await axios.post(`${endpoint}/datasets`, payload, {
      timeout: 60000,
    });
    if (registerResp.status !== 200) {
      throw new Error(`Registration failed: ${registerResp.statusText}`);
    }
    const registrations = registerResp.data;
    if (!registrations || !registrations.length) {
      throw new Error("No registrations returned");
    }
    const { datasetId: dsId, tableId: tbId } = registrations[0];

    // Submit annotation
    const annotatePayload = { lionConfig, retrieverConfig };
    const annotateResp = await axios.post(
      `${endpoint}/datasets/${dsId}/tables/${tbId}/annotate`,
      annotatePayload,
      { timeout: 60000 },
    );
    if (annotateResp.status !== 200) {
      throw new Error(
        `Annotation submission failed: ${annotateResp.statusText}`,
      );
    }
    const job = annotateResp.data;
    const jobId = job.jobId;

    // Poll for completion
    const statusUrl = `${endpoint}/dataset/${dsId}/table/${tbId}`;
    const pollInterval =
      parseFloat(process.env.LION_LINKER_POLL_INTERVAL || "1") * 1000;

    while (true) {
      await sleep(pollInterval);
      try {
        const statusResp = await axios.get(statusUrl, {
          params: { page: 1, per_page: 50 },
          timeout: 180000,
        });
        const statusData = statusResp.data;
        const status = statusData.status;
        if (status === "completed") {
          const annotatedRows = statusData.rows || [];
          // Cache the result
          try {
            await setCachedData(cacheKey, annotatedRows, 60 * 60 * 3600);
          } catch (cacheError) {
            console.error("Error setting cache:");
          }
          return { result: annotatedRows, labelDict: {}, error: null };
        } else if (status === "failed") {
          throw new Error(`Annotation failed: ${statusData.message}`);
        }
      } catch (error) {
        if (error.code === "ECONNABORTED") {
          console.log("Status request timed out; retrying...");
          continue;
        }
        throw error;
      }
    }
  } catch (err) {
    console.error("Error in lionLinker requestTransformer:", err);
    return {
      result: [],
      labelDict: {},
      error: req.config.errors.reconciler["01"],
    };
  }
};
