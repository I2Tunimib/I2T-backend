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
