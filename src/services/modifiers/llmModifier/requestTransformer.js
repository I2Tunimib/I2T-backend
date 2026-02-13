import {
  extractLLMJson,
  transformAdditionalColumns,
} from "../../../utils/dataUtils.js";
import config from "./index.js";
import OpenAI from "openai";
import cliProgress from "cli-progress";

const { endpoint } = config.private;

function latin1Safe(s) {
  if (s == null) return s;
  return String(s)
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-") // replace hyphens/dashes
    .replace(/[^\x00-\xff]/g, (c) => "?"); // drop remaining non‑Latin‑1
}

const openai = new OpenAI({
  apiKey: latin1Safe(
    process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
  ),
  baseURL: process.env.LLM_ADDRESS || "",
});

/**
 * Build prompt for inPlace operation
 */
function buildInPlacePrompt(cellValue, additionalContext, userInstructions) {
  const contextStr =
    additionalContext && additionalContext.length > 0
      ? `\n\nADDITIONAL CONTEXT (from other columns in the same row):\n${JSON.stringify(additionalContext, null, 2)}`
      : "";

  const fullPrompt = `You are a data modification assistant.
Your task is to modify the cell value according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified

CELL VALUE TO MODIFY:
${cellValue}
${contextStr}

USER'S INSTRUCTIONS:
${userInstructions}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- modifiedValue: string (the modified cell value)

Example:
{
  "modifiedValue": "Modified Result"
}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

/**
 * Build prompt for joinOp operation
 */
function buildJoinPrompt(joinedValue, userInstructions) {
  const fullPrompt = `You are a data modification assistant.
Your task is to process the joined column values according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified

JOINED VALUE TO PROCESS:
${joinedValue}

USER'S INSTRUCTIONS:
${userInstructions}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- modifiedValue: string (the processed/modified joined value)

Example:
{
  "modifiedValue": "Processed Result"
}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

/**
 * Build prompt for splitOp operation
 */
function buildSplitPrompt(cellValue, expectedParts, userInstructions) {
  const fullPrompt = `You are a data modification assistant.
Your task is to split the cell value into exactly ${expectedParts} parts according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified
- You MUST return exactly ${expectedParts} values in the array

CELL VALUE TO SPLIT:
${cellValue}

USER'S INSTRUCTIONS:
${userInstructions}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- splitValues: array of strings (exactly ${expectedParts} values)

Example:
{
  "splitValues": ["Part 1", "Part 2"${expectedParts > 2 ? ', "Part 3", ...' : ""}]
}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

/**
 * Build batch prompt that processes multiple items at once
 */
function buildBatchPrompt(promptItems, operationType) {
  let batchInstruction = "";

  if (operationType === "inPlace") {
    batchInstruction = `You are a data modification assistant.
Your task is to modify multiple cell values according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified
- Process ALL items in the batch and return results for each

ITEMS TO PROCESS:
${JSON.stringify(
  promptItems.map((p, idx) => ({
    itemIndex: idx,
    cellValue: p.originalValue,
    additionalContext: p.additionalContext,
    userInstructions: p.userInstructions,
  })),
  null,
  2,
)}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- results: array of objects, each containing:
  - itemIndex: number (matching the input itemIndex)
  - modifiedValue: string (the modified cell value)

Example:
{
  "results": [
    { "itemIndex": 0, "modifiedValue": "Modified Result 1" },
    { "itemIndex": 1, "modifiedValue": "Modified Result 2" }
  ]
}

YOUR JSON RESPONSE (nothing else):`;
  } else if (operationType === "joinOp") {
    batchInstruction = `You are a data modification assistant.
Your task is to process multiple joined column values according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified
- Process ALL items in the batch and return results for each

ITEMS TO PROCESS:
${JSON.stringify(
  promptItems.map((p, idx) => ({
    itemIndex: idx,
    joinedValue: p.originalValue,
    userInstructions: p.userInstructions,
  })),
  null,
  2,
)}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- results: array of objects, each containing:
  - itemIndex: number (matching the input itemIndex)
  - modifiedValue: string (the processed/modified joined value)

Example:
{
  "results": [
    { "itemIndex": 0, "modifiedValue": "Processed Result 1" },
    { "itemIndex": 1, "modifiedValue": "Processed Result 2" }
  ]
}

YOUR JSON RESPONSE (nothing else):`;
  } else if (operationType === "splitOp") {
    const expectedParts = promptItems[0]?.expectedParts || 2;
    batchInstruction = `You are a data modification assistant.
Your task is to split multiple cell values into exactly ${expectedParts} parts according to the user's instructions.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified
- Process ALL items in the batch and return results for each
- You MUST return exactly ${expectedParts} values in each splitValues array

ITEMS TO PROCESS:
${JSON.stringify(
  promptItems.map((p, idx) => ({
    itemIndex: idx,
    cellValue: p.originalValue,
    userInstructions: p.userInstructions,
  })),
  null,
  2,
)}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with this exact field:
- results: array of objects, each containing:
  - itemIndex: number (matching the input itemIndex)
  - splitValues: array of strings (exactly ${expectedParts} values)

Example:
{
  "results": [
    { "itemIndex": 0, "splitValues": ["Part 1", "Part 2"${expectedParts > 2 ? ', "Part 3", ...' : ""}] },
    { "itemIndex": 1, "splitValues": ["Part 1", "Part 2"${expectedParts > 2 ? ', "Part 3", ...' : ""}] }
  ]
}

YOUR JSON RESPONSE (nothing else):`;
  }

  return latin1Safe(batchInstruction);
}

/**
 * Make LLM calls with batching and progress bar
 */
async function callAll(
  prompts,
  operationType,
  model = process.env.LLM_MODEL || "gpt-3.5-turbo",
) {
  const BATCH_SIZE = 10;
  const batches = [];

  // Create batches of prompts
  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    batches.push(prompts.slice(i, i + BATCH_SIZE));
  }

  const bar = new cliProgress.SingleBar(
    {
      format:
        "Processing |{bar}| {percentage}% || {value}/{total} items || ETA: {eta_formatted}",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  if (process.stdout.isTTY) bar.start(prompts.length, 0);

  const allResults = [];

  // Process batches sequentially to avoid overwhelming the API
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const batchPrompt = buildBatchPrompt(batch, operationType);

      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: batchPrompt }],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error(
          `OpenAI returned empty response for batch #${batchIndex}`,
        );
      }

      const parsed = extractLLMJson(raw);

      if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
        console.error(
          `Failed to parse LLM batch response for batch #${batchIndex}. Raw response:`,
          raw,
        );
        // Return errors for all items in this batch
        batch.forEach((prompt) => {
          allResults.push({
            id: prompt.id,
            rowId: prompt.rowId,
            error: true,
            result: null,
          });
          if (process.stdout.isTTY) bar.increment();
        });
        continue;
      }

      // Map batch results back to individual prompts
      batch.forEach((prompt, localIndex) => {
        const batchResult = parsed.results.find(
          (r) => r.itemIndex === localIndex,
        );

        if (!batchResult) {
          console.error(
            `Missing result for itemIndex ${localIndex} in batch #${batchIndex}`,
          );
          allResults.push({
            id: prompt.id,
            rowId: prompt.rowId,
            error: true,
            result: null,
          });
        } else {
          // Remove itemIndex from result, keep only the actual data fields
          const { itemIndex, ...resultData } = batchResult;
          allResults.push({
            id: prompt.id,
            rowId: prompt.rowId,
            error: false,
            result: resultData,
          });
        }

        if (process.stdout.isTTY) bar.increment();
      });
    } catch (err) {
      console.error(
        `Error processing LLM batch request for batch #${batchIndex}:`,
        err,
      );
      // Return errors for all items in this batch
      batch.forEach((prompt) => {
        allResults.push({
          id: prompt.id,
          rowId: prompt.rowId,
          error: true,
          result: null,
        });
        if (process.stdout.isTTY) bar.increment();
      });
    }
  }

  if (process.stdout.isTTY) bar.stop();
  return allResults;
}

export default async (req) => {
  const { props, items } = req.original;
  const {
    operationType,
    columnToJoin,
    selectedColumns,
    renameJoinedColumn,
    renameNewColumnSplit,
    splitRenameMode,
    prompt: userInstructions,
  } = props;

  if (!userInstructions || userInstructions.trim() === "") {
    throw new Error("User instructions (prompt) are required.");
  }

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error("At least one column must be selected.");
  }

  // Transform additional columns for context
  const tableData = transformAdditionalColumns(
    req.original.props.additionalColumns || {},
  );
  const additionalColsNames = Object.keys(tableData);

  let prompts = [];
  let llmResponses = [];

  // Handle inPlace operation
  if (operationType === "inPlace") {
    console.log(
      `Processing ${selectedColumns.length} column(s) for in-place editing...`,
    );

    // Build prompts for each selected column
    selectedColumns.forEach((colId) => {
      const column = items[colId];
      if (!column) return;

      Object.entries(column).forEach(([rowId, cellData]) => {
        const cellValue = cellData?.[0] ?? "";

        // Gather additional context from other columns
        const rowIndex = Object.keys(items[selectedColumns[0]]).indexOf(rowId);
        const additionalContext = additionalColsNames.map((colName) => ({
          header: tableData[colName]?.header,
          value: tableData[colName]?.rows?.[rowIndex],
        }));

        const builtPrompt = buildInPlacePrompt(
          cellValue,
          additionalContext,
          userInstructions,
        );

        prompts.push({
          id: colId,
          rowId: rowId,
          originalValue: cellValue,
          additionalContext: additionalContext,
          userInstructions: userInstructions,
        });
      });
    });

    llmResponses = await callAll(prompts, operationType);

    return {
      operationType,
      selectedColumns,
      llmResponses,
      props: {
        operationType,
        selectedColumns,
        renameJoinedColumn: renameJoinedColumn || "",
        renameNewColumnSplit: renameNewColumnSplit || "",
        splitRenameMode: splitRenameMode || "",
      },
    };
  }

  // Handle joinOp operation
  if (operationType === "joinOp") {
    const allColumnsToJoin = [
      ...selectedColumns,
      ...Object.keys(columnToJoin || {}),
    ];

    if (allColumnsToJoin.length < 2) {
      throw new Error(
        "At least two columns must be selected for join operation.",
      );
    }

    console.log(
      `Processing join operation for ${allColumnsToJoin.length} columns...`,
    );

    const firstCol = allColumnsToJoin[0];
    const rowIds = Object.keys(items[firstCol]);

    // Build prompts for each row
    rowIds.forEach((rowId) => {
      const joinedParts = allColumnsToJoin.map((col) => {
        if (selectedColumns.includes(col)) {
          const cell = items[col]?.[rowId];
          return cell ? String(cell[0]) : "";
        } else if (columnToJoin?.[col]) {
          const cell = columnToJoin[col]?.[rowId];
          return cell ? String(cell[0]) : "";
        }
        return "";
      });

      const joinedValue = joinedParts.join("; ");
      const builtPrompt = buildJoinPrompt(joinedValue, userInstructions);

      prompts.push({
        id: "joined",
        rowId: rowId,
        originalValue: joinedValue,
        userInstructions: userInstructions,
      });
    });

    llmResponses = await callAll(prompts, operationType);

    return {
      operationType,
      selectedColumns,
      columnToJoin: columnToJoin || {},
      renameJoinedColumn: renameJoinedColumn || "",
      llmResponses,
      props: {
        operationType,
        columnToJoin: columnToJoin || {},
        selectedColumns,
        renameJoinedColumn: renameJoinedColumn || "",
        renameNewColumnSplit: renameNewColumnSplit || "",
        splitRenameMode: splitRenameMode || "",
      },
    };
  }

  // Handle splitOp operation
  if (operationType === "splitOp") {
    if (selectedColumns.length !== 1) {
      throw new Error(
        "Exactly one column must be selected for split operation.",
      );
    }

    const targetCol = selectedColumns[0];
    const rowEntries = Object.entries(items[targetCol]);

    if (rowEntries.length === 0) {
      throw new Error("Selected column contains no data.");
    }

    // Determine expected number of parts
    let expectedParts = 2;
    if (splitRenameMode === "custom" && renameNewColumnSplit) {
      const splitNames = renameNewColumnSplit
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      expectedParts = splitNames.length;
    }

    console.log(
      `Processing split operation for column ${targetCol} into ${expectedParts} parts...`,
    );

    // Build prompts for each row
    rowEntries.forEach(([rowId, cellData]) => {
      const cellValue = String(cellData?.[0] ?? "");
      const builtPrompt = buildSplitPrompt(
        cellValue,
        expectedParts,
        userInstructions,
      );

      prompts.push({
        id: targetCol,
        rowId: rowId,
        originalValue: cellValue,
        userInstructions: userInstructions,
        expectedParts: expectedParts,
      });
    });

    llmResponses = await callAll(prompts, operationType);

    return {
      operationType,
      selectedColumns,
      splitRenameMode: splitRenameMode || "auto",
      renameNewColumnSplit: renameNewColumnSplit || "",
      expectedParts,
      llmResponses,
      props: {
        operationType,
        selectedColumns,
        renameJoinedColumn: renameJoinedColumn || "",
        renameNewColumnSplit: renameNewColumnSplit || "",
        splitRenameMode: splitRenameMode || "",
      },
    };
  }

  throw new Error(`Unknown operation type: ${operationType}`);
};
