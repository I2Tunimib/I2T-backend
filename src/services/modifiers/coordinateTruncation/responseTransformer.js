export default async (req, res) => {
  // Coordinate truncation response transformer
  // Expects:
  //  - req.original.items: object mapping columnName -> { rowId: [value] | value, ... }
  //  - req.original.props: { selectedColumns: [], outputMode: "update"|"create", newColumnName: string, decimalPlaces: number|string }
  //
  // Behavior:
  //  - For each selected column, for each row value expected as "lat,lon" (comma separated),
  //    truncate each coordinate to `decimalPlaces` decimal digits (truncation, NOT rounding).
  //  - If outputMode === "create", writes results into `newColumnName`, otherwise overwrites the same column.
  //  - Returns a `response` object with `columns` keyed by output column containing `cells` with truncated values.
  //  - If a value is not in the expected format, the original (trimmed) value is returned unchanged.
  //  - Validates inputs and throws errors for invalid configuration (missing selectedColumns, invalid decimals, etc).
  const original = (req && req.original) || {};
  const items = original.items || {};
  const props = original.props || {};

  const {
    selectedColumns = [],
    outputMode = "update",
    newColumnName = "",
    decimalPlaces = 3,
  } = props;

  // Normalize selectedColumns
  const cols = Array.isArray(selectedColumns) ? selectedColumns : [];

  if (!cols || cols.length === 0) {
    throw new Error(
      "At least one column must be selected before running coordinate truncation.",
    );
  }

  const decimals = parseInt(decimalPlaces, 10);
  if (Number.isNaN(decimals) || decimals < 0) {
    throw new Error("decimalPlaces must be a non-negative integer.");
  }

  const response = { columns: {}, meta: {} };

  // Helper: truncate numeric string to N decimals without rounding.
  // Accepts strings like "-45.464664" or "9.18854" or "45" and returns truncated string.
  const truncateCoordinateString = (numStr, n) => {
    if (numStr == null) return "";
    const s = String(numStr).trim();
    if (s === "") return "";

    // Accept numbers with optional leading + or - and optional decimal part.
    // Reject things that clearly are not simple decimal numbers (keep original instead).
    // This regex requires at least one digit in the integer part.
    const numericRe = /^([+-]?)(\d+)(?:\.(\d*))?$/;
    const m = s.match(numericRe);
    if (!m) {
      // Not a simple numeric format: return original trimmed string
      return s;
    }
    const sign = m[1] || "";
    const intPart = m[2] || "0";
    const decPart = m[3] || "";

    if (n <= 0) {
      // strip decimals
      return `${sign}${intPart}`;
    }
    const truncatedDec = decPart.slice(0, n);
    return truncatedDec
      ? `${sign}${intPart}.${truncatedDec}`
      : `${sign}${intPart}`;
  };

  // Process each selected column
  cols.forEach((col) => {
    const outputColumn = outputMode === "create" ? newColumnName : col;

    // Validate output column when creating
    if (outputMode === "create") {
      if (!newColumnName || String(newColumnName).trim() === "") {
        throw new Error(
          "New column name is required when outputMode is 'create'.",
        );
      }
      if (items.hasOwnProperty(newColumnName)) {
        throw new Error(
          `Column '${newColumnName}' already exists in the dataset.`,
        );
      }
    }

    // Initialize column structure in the response
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

    // Iterate rows
    Object.entries(columnData).forEach(([rowId, val]) => {
      // dataset stores cell values sometimes as arrays [value], normalize to primitive
      const rawValue = Array.isArray(val) ? val[0] : val;
      const raw = rawValue == null ? "" : String(rawValue).trim();

      let transformed = raw;

      if (raw === "") {
        transformed = "";
      } else {
        // Split on first comma: latitude is the first part, longitude is the remainder joined back.
        // Allow spaces around comma(s).
        const parts = raw.split(",").map((p) => p.trim());
        if (parts.length < 2) {
          // Not lat,lon format — keep original value
          transformed = raw;
        } else {
          const lat = parts[0];
          const lon = parts.slice(1).join(","); // in case lon contains commas (unlikely but safe)
          const tlat = truncateCoordinateString(lat, decimals);
          const tlon = truncateCoordinateString(lon, decimals);
          transformed = `${tlat},${tlon}`;
        }
      }

      response.columns[outputColumn].cells[rowId] = {
        label: transformed,
        metadata: [],
      };
    });
  });

  return response;
};
