export default async (req, serviceResponse) => {
  // Extract data from serviceResponse (returned by requestTransformer)
  const {
    operationType,
    selectedColumns,
    llmResponses,
    columnToJoin,
    renameJoinedColumn,
    renameNewColumnSplit,
    splitRenameMode,
    expectedParts,
  } = serviceResponse;

  const response = { columns: {}, meta: {} };

  if (!llmResponses || llmResponses.length === 0) {
    throw new Error("No LLM responses received.");
  }

  // Handle inPlace operation - modify cells directly in selected columns
  if (operationType === "inPlace") {
    selectedColumns.forEach((colId) => {
      response.columns[colId] = {
        label: colId,
        kind: "",
        metadata: [],
        cells: {},
      };
    });

    llmResponses.forEach((llmResponse) => {
      const { id: colId, rowId, error, result } = llmResponse;

      if (error || !result || !result.modifiedValue) {
        // Keep original value on error
        console.warn(
          `Failed to modify cell at column ${colId}, row ${rowId}. Keeping original value.`,
        );
        response.columns[colId].cells[rowId] = {
          label: llmResponse.originalValue || "",
          metadata: [],
        };
      } else {
        response.columns[colId].cells[rowId] = {
          label: result.modifiedValue,
          metadata: [],
        };
      }
    });

    return response;
  }

  // Handle joinOp operation - create a single joined column with LLM-modified values
  if (operationType === "joinOp") {
    const allColumnsToJoin = [
      ...selectedColumns,
      ...Object.keys(columnToJoin || {}),
    ];

    const newColName =
      renameJoinedColumn && renameJoinedColumn.trim() !== ""
        ? renameJoinedColumn.trim()
        : `${allColumnsToJoin.join("_")}`;

    response.columns[newColName] = {
      label: newColName,
      kind: "",
      metadata: [],
      cells: {},
    };

    llmResponses.forEach((llmResponse) => {
      const { rowId, error, result } = llmResponse;

      if (error || !result || !result.modifiedValue) {
        console.warn(
          `Failed to process joined value for row ${rowId}. Using original value.`,
        );
        response.columns[newColName].cells[rowId] = {
          label: llmResponse.originalValue || "",
          metadata: [],
        };
      } else {
        response.columns[newColName].cells[rowId] = {
          label: result.modifiedValue,
          metadata: [],
        };
      }
    });

    return response;
  }

  // Handle splitOp operation - split a single column into multiple columns using LLM
  if (operationType === "splitOp") {
    if (selectedColumns.length !== 1) {
      throw new Error(
        "Exactly one column must be selected for split operation.",
      );
    }

    const targetCol = selectedColumns[0];

    // Determine column names for split results
    let splitNames = [];
    if (splitRenameMode === "custom" && renameNewColumnSplit) {
      splitNames = renameNewColumnSplit
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      if (splitNames.length !== expectedParts) {
        throw new Error(
          `Expected ${expectedParts} column names, but got ${splitNames.length}.`,
        );
      }
    } else {
      // Auto-generate names
      splitNames = Array.from(
        { length: expectedParts },
        (_, i) => `${targetCol}_${i + 1}`,
      );
    }

    // Initialize all split columns
    splitNames.forEach((name) => {
      response.columns[name] = {
        label: name,
        kind: "",
        metadata: [],
        cells: {},
      };
    });

    // Process LLM responses and populate cells
    llmResponses.forEach((llmResponse) => {
      const { rowId, error, result } = llmResponse;

      if (
        error ||
        !result ||
        !result.splitValues ||
        !Array.isArray(result.splitValues)
      ) {
        console.warn(
          `Failed to split value for row ${rowId}. Using empty values.`,
        );
        // Fill with empty values on error
        splitNames.forEach((colName) => {
          response.columns[colName].cells[rowId] = {
            label: "",
            metadata: [],
          };
        });
      } else {
        const splitValues = result.splitValues;

        // Ensure we have the expected number of parts
        if (splitValues.length !== expectedParts) {
          console.warn(
            `LLM returned ${splitValues.length} values for row ${rowId}, expected ${expectedParts}. Padding or truncating.`,
          );
        }

        splitNames.forEach((colName, i) => {
          response.columns[colName].cells[rowId] = {
            label: splitValues[i] ?? "",
            metadata: [],
          };
        });
      }
    });

    return response;
  }

  throw new Error(`Unknown operation type: ${operationType}`);
};
