export default async (req) => {
  // Prepare and normalise only the props that are relevant to coordinate truncation.
  // Expected props:
  // - selectedColumns: array of column names to operate on
  // - outputMode: "update" or "create"
  // - newColumnName: name to use when outputMode === "create"
  // - decimalPlaces: number (or string) of decimal digits to keep (truncation, not rounding)
  const original = (req && req.original) || {};
  const incoming = original.props || {};

  const { selectedColumns, outputMode, newColumnName, decimalPlaces } =
    incoming;

  return {
    props: {
      // Ensure selectedColumns is always an array
      selectedColumns: Array.isArray(selectedColumns) ? selectedColumns : [],
      // Limit outputMode to known values; default to 'update'
      outputMode: outputMode === "create" ? "create" : "update",
      // Keep newColumnName as provided (empty string if not)
      newColumnName: typeof newColumnName === "string" ? newColumnName : "",
      // Normalize decimalPlaces to a string (response transformer can parseInt)
      // Default to \"3\" if not provided
      decimalPlaces:
        decimalPlaces !== undefined && decimalPlaces !== null
          ? String(decimalPlaces)
          : "3",
    },
  };
};
