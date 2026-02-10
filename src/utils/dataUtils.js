import OpenAI from "openai";

/**
 * Transform additionalColumns into a map keyed by column id.
 *
 */
export function transformAdditionalColumns(additionalColumns) {
  const result = {};
  if (!additionalColumns || typeof additionalColumns !== "object")
    return result;

  Object.keys(additionalColumns).forEach((colId) => {
    const colData = additionalColumns[colId];
    if (!colData || typeof colData !== "object") return;

    // header label found in r0[2] according to the original code
    const header = colData.r0 ? colData.r0[2] : null;

    // Collect row entries as [index, value] so we can sort them by index
    const rowEntries = Object.keys(colData).reduce((acc, key) => {
      const match = key.match(/^r(\d+)$/);
      if (!match) return acc;
      const idx = parseInt(match[1], 10);
      // value is taken as first element of the rN array per original code
      const value = Array.isArray(colData[key])
        ? colData[key][0]
        : colData[key];
      acc.push([idx, value]);
      return acc;
    }, []);

    // sort by row index and map to values
    rowEntries.sort((a, b) => a[0] - b[0]);
    const rows = rowEntries.map(([, value]) => value);

    result[colId] = { header, rows };
  });

  return result;
}

export function extractLLMJson(input) {
  try {
    // First, try to extract from markdown code fence
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const fenceMatch = input.match(fenceRegex);
    let candidate = fenceMatch ? fenceMatch[1].trim() : input.trim();

    // Find the first { or [
    const firstBrace = candidate.indexOf("{");
    const firstBracket = candidate.indexOf("[");

    // Determine which comes first (or if only one exists)
    let startChar, endChar, startIndex;
    if (
      firstBracket !== -1 &&
      (firstBrace === -1 || firstBracket < firstBrace)
    ) {
      startChar = "[";
      endChar = "]";
      startIndex = firstBracket;
    } else if (firstBrace !== -1) {
      startChar = "{";
      endChar = "}";
      startIndex = firstBrace;
    } else {
      throw new Error("No JSON object or array found in response");
    }

    // Extract from first character and find matching closing character
    let braceCount = 0;
    let endIndex = -1;

    for (let i = startIndex; i < candidate.length; i++) {
      if (candidate[i] === startChar) {
        braceCount++;
      } else if (candidate[i] === endChar) {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      throw new Error(
        `No complete JSON ${startChar === "[" ? "array" : "object"} found in response`,
      );
    }

    const jsonStr = candidate.slice(startIndex, endIndex + 1);

    // Parse to JS object or array
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Invalid JSON string:", err.message);
    return null;
  }
}

//TODO: decide if this needs to be moved somewhere else or if the file should be renamed

export function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-") // replace all hyphens/dashes
    .replace(/[^\x00-\xff]/g, (c) => "?"); // drop remaining non‑Latin‑1
}
export const openai = new OpenAI({
  apiKey: latin1Safe(
    process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey",
  ), // prefer env LLM_KEY or OPENAI_API_KEY
  baseURL: process.env.LLM_ADDRESS || "", // YOUR URL
});
