import config from "./index.js";
import OpenAI from "openai";

const { endpoint } = config.private;

function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-") // replace all hyphens/dashes
    .replace(/[^\x00-\xff]/g, (c) => "?"); // drop remaining non‑Latin‑1
}

const openai = new OpenAI({
  apiKey: latin1Safe("sk-localapikey"), // required
  baseURL: process.env.LLM_ADDRESS || "", // YOUR URL
});

function buildPrompt(value, userPrompt, columnNames) {
  // Build the column structure for the JSON response
  const columnStructure = columnNames
    .map((col) => `"${col}": "value"`)
    .join(", ");

  const fullPrompt = `You are a data processing assistant. Your task is to analyze the provided data and return results in a strict JSON format.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified

CELL DATA:
${value}

USER INSTRUCTIONS:
${userPrompt}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with exactly these fields: ${columnNames.join(", ")}

Example:
{${columnStructure}}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

function extractJson(input) {
  try {
    // First, try to extract from markdown code fence
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const fenceMatch = input.match(fenceRegex);
    let candidate = fenceMatch ? fenceMatch[1].trim() : input.trim();

    // Find the first { and last } to extract just the JSON object
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response");
    }

    const jsonStr = candidate.slice(firstBrace, lastBrace + 1);

    // Parse to JS object
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Invalid JSON string:", err.message);
    return null;
  }
}

async function callAll(
  prompts,
  columnNames,
  model = process.env.LLM_MODEL || "phi4-mini",
) {
  return await Promise.all(
    prompts.map(async (prompt, index) => {
      try {
        console.log(`\n========== LLM REQUEST #${index} ==========`);
        console.log("PROMPT SENT TO LLM:");
        console.log(prompt.prompt);
        console.log("==========================================\n");

        const startTime = Date.now();
        const completion = await Promise.race([
          openai.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt.prompt }],
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("LLM request timeout after 30s")),
              30000,
            ),
          ),
        ]);
        const duration = Date.now() - startTime;
        console.log(`LLM request #${index} completed in ${duration}ms`);

        const raw = completion.choices[0]?.message?.content;

        console.log(`\n========== LLM RESPONSE #${index} ==========`);
        console.log("RAW RESPONSE FROM LLM:");
        console.log(raw);
        console.log("==========================================\n");
        if (!raw) {
          throw new Error(
            `OpenAI returned empty response for prompt #${index}`,
          );
        }

        const parsed = extractJson(raw);
        if (!parsed) {
          console.error(
            `Failed to parse LLM response for prompt #${index}. Raw response:`,
            raw,
          );
          // Return null values for all columns
          const emptyResult = { rowId: prompt.rowId };
          columnNames.forEach((col) => {
            emptyResult[col] = null;
          });
          return emptyResult;
        }

        return {
          ...parsed,
          rowId: prompt.rowId,
        };
      } catch (err) {
        console.error(
          `Error processing LLM request for prompt #${index}:`,
          err,
        );
        // Return null values for all columns
        const emptyResult = { rowId: prompt.rowId };
        columnNames.forEach((col) => {
          emptyResult[col] = null;
        });
        return emptyResult;
      }
    }),
  );
}

export default async (req) => {
  const { items, props } = req.original;

  // Get the column names from user input (comma-separated)
  const columnNamesInput = props.columnNames || "";
  const columnNames = columnNamesInput
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  // Get the user's custom prompt
  const userPrompt = props.prompt || "";

  if (columnNames.length === 0) {
    throw new Error("Please provide at least one column name");
  }

  if (!userPrompt) {
    throw new Error("Please provide a prompt for processing the data");
  }

  // Get the first item column
  const itemCol = items[Object.keys(items)[0]];

  // Prepare prompts for LLM calls
  const prompts = Object.keys(itemCol).map((rowId) => {
    const rowData = itemCol[rowId];
    const value = rowData?.value || "";

    const builtPrompt = buildPrompt(value, userPrompt, columnNames);
    return {
      prompt: builtPrompt,
      rowId: rowId,
    };
  });

  console.log(`Processing ${prompts.length} rows with LLM`);

  // Make LLM calls and get responses
  const llmResponses = await callAll(prompts, columnNames);

  // Build enriched rows
  const enrichedRows = llmResponses.map((response) => {
    const result = { rowId: response.rowId };

    // Add each column from the LLM response
    columnNames.forEach((colName) => {
      result[colName] = response[colName] || null;
    });

    return result;
  });

  return enrichedRows;
};
