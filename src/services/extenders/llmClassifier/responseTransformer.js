/**
 * Transforms the enriched data with LLM COFOG classification results into a structured format
 * suitable for downstream consumption.
 *
 * @param {Object} req - The request object (not used, but kept for interface consistency)
 * @param {Array} enrichedRows - Array of enriched data with LLM classification results.
 *   Each row should have: cofog_label, confidence, reasoning, plus original data
 * @returns {Object} response - Structured response with columns for each field
 */
export default async (req, enrichedRows) => {
  // Prepare response object with columns for each COFOG result field
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

  // Populate cells for each column using enriched data
  enrichedRows.forEach((row, idx) => {
    const rowId = row.rowId ?? idx;

    // Map cofog_label to full category name
    const label = row.cofog_label;
    const cofogLabelFull = label
      ? cofogCategories[label]
      : "Response not available";

    response.columns.cofog_label.cells[rowId] = {
      label: cofogLabelFull,
      metadata: [],
    };
    response.columns.confidence.cells[rowId] = {
      label: row.confidence || "-",
      metadata: [],
    };
    response.columns.reasoning.cells[rowId] = {
      label: row.reasoning || "-",
      metadata: [],
    };
  });

  return response;
};
