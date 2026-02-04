import {
  extractLLMJson,
  transformAdditionalColumns,
} from "../../../utils/dataUtils.js";
import config from "./index.js";
import OpenAI from "openai";
import cliProgress from "cli-progress";

const { endpoint } = config.private;

function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-") // replace all hyphens/dashes
    .replace(/[^\x00-\xff]/g, (c) => "?"); // drop remaining non‑Latin‑1
}

const openai = new OpenAI({
  apiKey: latin1Safe(
    process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
  ), // prefer env LLM_KEY or OPENAI_API_KEY
  baseURL: process.env.LLM_ADDRESS || "", // YOUR URL
});

function buildPrompt(cellValue, additionalData) {
  const fullPrompt = `You are a data reconciliation assistant.
    Your task is to match text values to wikidata entities and return results in strict JSON format.
    Youcould have additional information to help the reconciliation.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified

CELL VALUE TO RECONCILE:
${cellValue}

The additional data have this schema: {headers: [<NAME OF THE COLUMNS USED TO ADD ADDITIONAL INFO>], rowValues: [<ACTUAL DATA OF THE CURRENT ROW FOR EACH HEADER]}
ADDITIONAL DATA:
${additionalData}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with these exact fields:
- entityId: string (the full entity ID WITH prefix, e.g., "wd:Q2007919" or "wd:123456")
- name: string (the entity name/label)
- description: string (brief description of the entity)
- score: number (confidence score from 0-100)
- match: boolean (true if confident match, false if uncertain)

Example:
{
  "entityId": "wd:Q2007919",
  "name": "John F. Kennedy Presidential Library and Museum",
  "description": "Presidential library in Boston, Massachusetts",
  "score": 95,
  "match": true
}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

async function callAll(prompts, model = process.env.LLM_MODEL || "phi4-mini") {
  const bar = new cliProgress.SingleBar(
    {
      format:
        "Processing |{bar}| {percentage}% || {value}/{total} prompts || ETA: {{eta_formatted}",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
  if (process.stdout.isTTY) bar.start(prompts.length, 0);
  return await Promise.all(
    prompts.map(async (prompt, index) => {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt.prompt }],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw)
          throw new Error(
            `OpenAI returned empty response for prompt #${index}`,
          );

        const parsed = extractLLMJson(raw);
        if (process.stdout.isTTY) bar.increment();
        if (!parsed) {
          console.error(
            `Failed to parse LLM response for prompt #${index}. Raw response:`,
            raw,
          );
          return {
            id: prompt.id,
            entityId: null,
            name: null,
            description: null,
            score: 0,
            match: false,
          };
        }

        return {
          id: prompt.id,
          ...parsed,
        };
      } catch (err) {
        console.error(
          `Error processing LLM request for prompt #${index}:`,
          err,
        );
        // Return empty object for this prompt
        return {
          id: prompt.id,
          entityId: null,
          name: null,
          description: null,
          score: 0,
          match: false,
        };
      }
    }),
  );
}

export default async (req) => {
  const { items, props } = req.original;

  const tableData = transformAdditionalColumns(
    req.original.props.additionalColumns,
  );

  console.log(`Processing ${items.slice(1).length} items for reconciliation`);
  const additionalColsNames = Object.keys(tableData);
  // Prepare prompts for LLM calls
  const prompts = items.slice(1).map((item, index) => {
    const cellValue = item.label || "";
    const additionalValues = additionalColsNames.reduce((acc, colName) => {
      const value = tableData[colName]?.rows?.[index];
      if (value !== undefined) acc.push(value);
    });
    const promptData = {
      headers: additionalColsNames,
      rowValues: additionalValues,
    };
    const builtPrompt = buildPrompt(cellValue, promptData);
    return {
      prompt: builtPrompt,
      id: item.id,
      cellValue: cellValue,
    };
  });

  // Make LLM calls and get responses
  const llmResponses = await callAll(prompts);

  return { items: items, llmResponses };
};
