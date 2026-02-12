export default async (req, res) => {
  const { items, props } = req.original;
  const {
    operationType,
    selectedColumns,
    pattern,
    replacement,
    flags,
    matchCount,
    matchIndex,
    outputMode,
    newColumnName,
  } = props;

  console.log("[RegexpModifier] Starting with:", {
    operationType,
    pattern,
    flags,
    selectedColumns,
    outputMode,
    newColumnName,
  });

  const response = { columns: {}, meta: {} };

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error(
      "At least one column must be selected before running the operation.",
    );
  }

  if (!pattern) {
    throw new Error("Pattern is required for regexp operations.");
  }

  // Validate and create regex
  let regex;
  try {
    // For operations that need global flag, ensure it's present
    const needsGlobal = [
      "extractAll",
      "extractUpToN",
      "count",
      "replace",
    ].includes(operationType);

    // extractFirst and test should NOT use global flag
    const shouldNotUseGlobal = ["extractFirst", "test"].includes(operationType);

    let finalFlags = flags || "";

    if (shouldNotUseGlobal) {
      // Remove 'g' flag for operations that don't need it
      finalFlags = finalFlags.replace(/g/g, "");
    } else if (needsGlobal && !finalFlags.includes("g")) {
      // Add 'g' flag if needed and not already present
      finalFlags = finalFlags + "g";
    }

    regex = new RegExp(pattern, finalFlags);
    console.log(
      "[RegexpModifier] Created regex with flags:",
      finalFlags || "(none)",
    );
  } catch (error) {
    throw new Error(`Invalid regular expression: ${error.message}`);
  }

  selectedColumns.forEach((col) => {
    // Determine the output column name based on outputMode
    const outputColumn = outputMode === "newColumn" ? newColumnName : col;

    // Validate new column name if creating a new column
    if (outputMode === "newColumn") {
      if (!newColumnName || newColumnName.trim() === "") {
        throw new Error(
          "New column name is required when creating a new column.",
        );
      }
      if (items[newColumnName]) {
        throw new Error(
          `Column '${newColumnName}' already exists in the dataset.`,
        );
      }
    }

    response.columns[outputColumn] = {
      label: outputColumn,
      kind: "",
      metadata: [],
      cells: {},
    };

    const columnData = items[col];
    if (!columnData) {
      throw new Error(`Column '${col}' not found in dataset.`);
    }

    console.log(
      `[RegexpModifier] Processing column '${col}' with ${Object.keys(columnData).length} rows, output to '${outputColumn}'`,
    );

    Object.entries(columnData).forEach(([rowId, val]) => {
      // Extract the actual value from the array structure
      const rawValue = Array.isArray(val) ? val[0] : val;
      const raw = String(rawValue ?? "");
      let transformed = raw;

      console.log(`[RegexpModifier] Row ${rowId}: raw value = "${raw}"`);

      switch (operationType) {
        case "replace": {
          // Match and replace
          if (
            replacement === undefined ||
            replacement === null ||
            replacement === ""
          ) {
            throw new Error(
              "Replacement string is required for replace operation.",
            );
          }
          transformed = raw.replace(regex, replacement);
          console.log(`[RegexpModifier] Replace result: "${transformed}"`);
          break;
        }

        case "extractAll": {
          // Take all matches
          const matches = raw.match(regex);
          console.log(`[RegexpModifier] ExtractAll matches:`, matches);
          if (matches && matches.length > 0) {
            transformed = matches.join(", ");
          } else {
            transformed = "";
          }
          console.log(`[RegexpModifier] ExtractAll result: "${transformed}"`);
          break;
        }

        case "extractNth": {
          // Take the nth match
          const index = parseInt(matchIndex, 10);
          if (isNaN(index) || index < 0) {
            throw new Error(
              "Valid match index (0 or greater) is required for extractNth operation.",
            );
          }
          // Create a regex with global flag for this operation
          const globalRegex = new RegExp(
            pattern,
            flags ? flags + (flags.includes("g") ? "" : "g") : "g",
          );
          const matches = raw.match(globalRegex);
          console.log(
            `[RegexpModifier] ExtractNth matches:`,
            matches,
            `looking for index ${index}`,
          );
          if (matches && matches.length > index) {
            transformed = matches[index];
          } else {
            transformed = "";
          }
          console.log(`[RegexpModifier] ExtractNth result: "${transformed}"`);
          break;
        }

        case "extractUpToN": {
          // Take up to n matches
          const count = parseInt(matchCount, 10);
          if (isNaN(count) || count <= 0) {
            throw new Error(
              "Valid match count (greater than 0) is required for extractUpToN operation.",
            );
          }
          const matches = raw.match(regex);
          console.log(
            `[RegexpModifier] ExtractUpToN matches:`,
            matches,
            `taking ${count}`,
          );
          if (matches && matches.length > 0) {
            const limitedMatches = matches.slice(0, count);
            transformed = limitedMatches.join(", ");
          } else {
            transformed = "";
          }
          console.log(`[RegexpModifier] ExtractUpToN result: "${transformed}"`);
          break;
        }

        case "extractFirst": {
          // Take the first match
          // Use regex without 'g' flag to get the first match only
          const firstMatchRegex = new RegExp(
            pattern,
            flags ? flags.replace(/g/g, "") : "",
          );
          const match = raw.match(firstMatchRegex);
          console.log(`[RegexpModifier] ExtractFirst match:`, match);
          if (!match) {
            console.log(
              `[RegexpModifier] No match found. Check if pattern "${pattern}" with anchors (^$) is too restrictive.`,
            );
          }
          transformed = match ? match[0] : "";
          console.log(`[RegexpModifier] ExtractFirst result: "${transformed}"`);
          break;
        }

        case "test": {
          // Test if pattern matches (returns true/false)
          // Remove 'g' flag for test operation
          const testRegex = new RegExp(
            pattern,
            flags ? flags.replace(/g/g, "") : "",
          );
          const testResult = testRegex.test(raw);
          console.log(`[RegexpModifier] Test result:`, testResult);
          if (!testResult) {
            console.log(
              `[RegexpModifier] Pattern "${pattern}" did not match "${raw}"`,
            );
          }
          transformed = testResult ? "true" : "false";
          break;
        }

        case "count": {
          // Count number of matches
          const matches = raw.match(regex);
          console.log(`[RegexpModifier] Count matches:`, matches);
          transformed = String(matches ? matches.length : 0);
          console.log(`[RegexpModifier] Count result: "${transformed}"`);
          break;
        }

        default:
          throw new Error(`Unknown operation type: ${operationType}`);
      }

      response.columns[outputColumn].cells[rowId] = {
        label: transformed,
        metadata: [],
      };
    });
  });

  console.log(
    "[RegexpModifier] Completed. Sample results:",
    Object.keys(response.columns).map((col) => ({
      column: col,
      firstCell:
        response.columns[col].cells[
          Object.keys(response.columns[col].cells)[0]
        ],
    })),
  );

  return response;
};
