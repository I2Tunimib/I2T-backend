import config from "./index.js";
import { fetchWikidataInformation } from "../../../utils/wikidataUtils.js";
import OpenAI from "openai";

const { endpoint } = config.private;
const allowedPrefixes = ["wd", "wdA"];

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

function buildCofogPrompt(record_data) {
  return latin1Safe(`
Based on the following information about a government department or public organization,
classify it into a single, top-level COFOG (Classification of the Functions of Government) category.
Use only the information provided to make your decision.

Organization Information:
Name: ${record_data.name || ""}
Description: ${record_data.description || ""}
Country: ${record_data.country || ""}
Wikidata Description: ${record_data.wikidataDescription || ""}
Wikidata Type: ${record_data.wikidataType || ""}

COFOG Categories:
01 - General public services
02 - Defence
03 - Public order and safety
04 - Economic affairs
05 - Environmental protection
06 - Housing and community amenities
07 - Health
08 - Recreation, culture and religion
09 - Education
10 - Social protection

Provide your response in JSON format with the following fields:
cofog_label: A single number between 01 and 10 representing the most appropriate COFOG category
confidence: 'high', 'medium', or 'low', indicating your confidence in this classification
reasoning: A brief explanation of why you chose this category

Example response:
{"cofog_label": "04", "confidence": "high", "reasoning": "This organization is primarily involved in economic development and infrastructure, which falls under Economic affairs."}
`);
}

function getMostPopularForMissing(missingItemWikidataId, fullResponse) {
  let freqMapping = {};
  let filteredResp = fullResponse.filter(
    (resp) => resp.wikidataId === missingItemWikidataId,
  );
  filteredResp.map((resp) => {
    if (resp.cofog_label)
      freqMapping[resp.cofog_label] = (freqMapping[resp.cofog_label] ?? 0) + 1;
  });
  console.log("freqmapping", freqMapping);
  if (filteredResp.length > 0) {
    let maxFreq = {
      freq: freqMapping[Object.keys(freqMapping)[0]],
      key: Object.keys(freqMapping)[0],
    };
    for (let key of Object.keys(freqMapping)) {
      if (freqMapping[key] > maxFreq.freq) {
        maxFreq["key"] = key;
        maxFreq["freq"] = freqMapping[key];
      }
    }
    console.log("done processing, returning", maxFreq["key"]);
    return maxFreq["key"];
  } else {
    return null;
  }
}

async function callAll(prompts, model = process.env.LLM_MODEL || "phi4-mini") {
  console.log("creating promises");
  return await Promise.all(
    prompts.map(async (prompt, index) => {
      try {
        console.log("sending prompt to openai");
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt.prompt }],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw)
          throw new Error(
            `OpenAI returned empty response for prompt #${index}`,
          );

        // Helper to extract JSON from responses that may be wrapped in
        // markdown code fences or contain surrounding text.
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

        const parsed = extractJson(raw);
        if (!parsed) {
          console.error(
            `Failed to parse LLM response for prompt #${index}. Raw response:`,
            raw,
          );
          return {
            cofog_label: null,
            confidence: null,
            reasoning: null,
            rowId: prompt.rowId,
            wikidataId: prompt.wikidataId,
          };
        }

        return {
          ...parsed,
          rowId: prompt.rowId,
          wikidataId: prompt.wikidataId,
        };
      } catch (err) {
        console.error(
          `Error processing LLM request for prompt #${index}:`,
          err,
        );
        // Return empty object for this prompt
        return {
          cofog_label: null,
          confidence: null,
          reasoning: null,
          rowId: prompt.rowId,
          wikidataId: prompt.wikidataId,
        };
      }
    }),
  );
}
export default async (req) => {
  const { items, props } = req.original;

  const itemCol = items[Object.keys(items)[0]];
  const descriptionCol = props.description
    ? Object.keys(props.description).map((key) => props.description[key][0])
    : [];
  const countryCol = props.country
    ? Object.keys(props.country).map((key) => props.country[key][0])
    : [];
  console.log("fetching wikidata info if available");

  const fullRows = await Promise.all(
    Object.keys(itemCol).map(async (rowId, index) => {
      const cell = itemCol[rowId] || {};
      const name = cell.value ? String(cell.value) : "";
      const country = countryCol[index] ? countryCol[index] : "";
      const description = descriptionCol[index] ? descriptionCol[index] : "";

      // If we have a kbId, try to fetch richer wikidata information.
      if (cell.kbId) {
        try {
          const wikidataInfo = await fetchWikidataInformation(cell.kbId);
          return {
            ...wikidataInfo,
            wikidataId: String(cell.kbId)
              .replace("wdA:", "")
              .replace("wd:", ""),
            name,
            country,
            description,
            rowId,
          };
        } catch (err) {
          // If fetching Wikidata fails, fall through and return a minimal record.
          console.error("Error fetching wikidata info for", cell.kbId, err);
        }
      } else {
        // Log absence of kbId to help debugging
        console.log(
          `No kbId for row ${rowId} — proceeding with minimal record`,
        );
      }

      // Return a minimal record so the LLM is still invoked even when Wikidata info is missing.
      return {
        wikidataId: null,
        wikidataDescription: "",
        wikidataType: "",
        name,
        country,
        description,
        rowId,
      };
    }),
  );

  // Prepare prompts for LLM calls
  const prompts = fullRows.map((row) => ({
    prompt: buildCofogPrompt(row),
    rowId: row.rowId,
    wikidataId: row.wikidataId,
  }));

  // Make LLM calls and get responses
  const llmResponses = await callAll(prompts);

  // Enrich fullRows with LLM responses
  const enrichedRows = fullRows.map((row, index) => {
    const llmResponse =
      llmResponses.find((resp) => resp.rowId === row.rowId) || {};

    // Handle missing responses using getMostPopularForMissing
    let cofog_label = llmResponse.cofog_label;
    if (!cofog_label) {
      cofog_label = getMostPopularForMissing(row.wikidataId, llmResponses);
    }

    return {
      ...row,
      cofog_label,
      confidence: llmResponse.confidence,
      reasoning: llmResponse.reasoning,
    };
  });

  return enrichedRows;
};
