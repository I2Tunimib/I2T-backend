import fs from "fs";
import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
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

async function callAll(prompts, model = "phi4-mini") {
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

        return {
          ...JSON.parse(raw),
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
/**
 * Transforms the LLM COFOG classification response into a structured format
 * suitable for downstream consumption.
 *
 * @param {Object} req - The request object (not used, but kept for interface consistency)
 * @param {Array} res - Array of classification results from the LLM.
 *   Each result should have: cofog_label, confidence, reasoning
 * @returns {Object} response - Structured response with columns for each field
 */
export default async (req, fullRows) => {
  // Prepare response object with columns for each COFOG result field
  const prompts = fullRows.map((row) => ({
    prompt: buildCofogPrompt(row),
    rowId: row.rowId,
    wikidataId: row.wikidataId,
  }));
  const responses = await callAll(prompts);
  let response = {
    columns: {
      cofog_label: {
        label: "COFOG Category",
        cells: {},
        metadata: [],
      },
      confidence: {
        label: "Confidence",
        cells: {},
        metadata: [],
      },
      reasoning: {
        label: "Reasoning",
        cells: {},
        metadata: [],
      },
    },
    meta: {},
  };

  // COFOG category mapping
  const cofogCategories = {
    "01": "01 - General public services",
    "02": "02 - Defence",
    "03": "03 - Public order and safety",
    "04": "04 - Economic affairs",
    "05": "05 - Environmental protection",
    "06": "06 - Housing and community amenities",
    "07": "07 - Health",
    "08": "08 - Recreation, culture and religion",
    "09": "09 - Education",
    10: "10 - Social protection",
  };

  // Populate cells for each column using responses, compatible with meteoPropertiesOpenMeteo
  responses.forEach((result, idx) => {
    const rowId = fullRows[idx]?.rowId ?? idx;
    // Map cofog_label to full category name
    let label = "";
    if (!result.cofog_label) {
      label = getMostPopularForMissing(result.wikidataId, responses);
    } else {
      label = result.cofog_label;
    }
    const cofogLabelFull = label
      ? cofogCategories[label]
      : "Response not available";

    response.columns.cofog_label.cells[rowId] = {
      label: cofogLabelFull,
      metadata: [],
    };
    response.columns.confidence.cells[rowId] = {
      label: result.confidence || "-",
      metadata: [],
    };
    response.columns.reasoning.cells[rowId] = {
      label: result.reasoning || "-",
      metadata: [],
    };
    // Optionally, set meta mapping if you have input columns
    // response.meta['cofog_label'] = ...;
    // response.meta['confidence'] = ...;
    // response.meta['reasoning'] = ...;
  });

  return response;
};
