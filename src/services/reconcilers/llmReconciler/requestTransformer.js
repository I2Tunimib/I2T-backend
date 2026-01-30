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
  apiKey: latin1Safe(
    process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
  ), // prefer env LLM_KEY or OPENAI_API_KEY
  baseURL: process.env.LLM_ADDRESS || "", // YOUR URL
});

function buildPrompt(cellValue, userPrompt, prefix) {
  const fullPrompt = `You are a data reconciliation assistant. Your task is to match text values to knowledge base entities and return results in strict JSON format.

SYSTEM INSTRUCTIONS:
- You MUST respond ONLY with valid JSON
- Do NOT include any explanatory text before or after the JSON
- Do NOT use markdown code blocks or formatting
- Do NOT engage in conversation
- Return ONLY a single JSON object with the exact fields specified

CELL VALUE TO RECONCILE:
${cellValue}

USER INSTRUCTIONS:
${userPrompt}

REQUIRED JSON OUTPUT FORMAT:
You must return a JSON object with these exact fields:
- entityId: string (the full entity ID WITH prefix, e.g., "${prefix}:Q2007919" or "${prefix}:123456")
- name: string (the entity name/label)
- description: string (brief description of the entity)
- score: number (confidence score from 0-100)
- match: boolean (true if confident match, false if uncertain)

Example:
{
  "entityId": "${prefix}:Q2007919",
  "name": "John F. Kennedy Presidential Library and Museum",
  "description": "Presidential library in Boston, Massachusetts",
  "score": 95,
  "match": true
}

YOUR JSON RESPONSE (nothing else):`;

  return latin1Safe(fullPrompt);
}

function extractJson(input) {
  try {
    // First, try to extract from markdown code fence
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const fenceMatch = input.match(fenceRegex);
    let candidate = fenceMatch ? fenceMatch[1].trim() : input.trim();

    // Find the first {
    const firstBrace = candidate.indexOf("{");

    if (firstBrace === -1) {
      throw new Error("No JSON object found in response");
    }

    // Extract from first { and find matching closing }
    let braceCount = 0;
    let endIndex = -1;

    for (let i = firstBrace; i < candidate.length; i++) {
      if (candidate[i] === "{") {
        braceCount++;
      } else if (candidate[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      throw new Error("No complete JSON object found in response");
    }

    const jsonStr = candidate.slice(firstBrace, endIndex + 1);

    // Parse to JS object
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Invalid JSON string:", err.message);
    return null;
  }
}

async function callAll(prompts, model = process.env.LLM_MODEL || "phi4-mini") {
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

        const parsed = extractJson(raw);
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

  // Get user configuration
  const userPrompt = props.prompt || "";
  const prefix = props.prefix || "wd";
  const uri = props.uri || "https://www.wikidata.org/wiki/";

  if (!userPrompt) {
    throw new Error("Please provide reconciliation instructions");
  }

  if (!prefix) {
    throw new Error("Please provide an entity prefix");
  }

  // items is an array where first item is the header, rest are body cells
  // Skip the first item (header) and process the rest
  const bodyItems = items.slice(1);

  console.log(`Processing ${bodyItems.length} items for reconciliation`);

  // Prepare prompts for LLM calls
  const prompts = bodyItems.map((item) => {
    const cellValue = item.label || "";
    const builtPrompt = buildPrompt(cellValue, userPrompt, prefix);
    return {
      prompt: builtPrompt,
      id: item.id,
      cellValue: cellValue,
    };
  });

  // Make LLM calls and get responses
  const llmResponses = await callAll(prompts);

  return { items: items, llmResponses: llmResponses, prefix: prefix, uri: uri };
};
