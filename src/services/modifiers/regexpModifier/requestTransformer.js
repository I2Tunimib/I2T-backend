export default async (req) => {
  const { props } = req.original;
  const {
    operationType,
    selectedColumns,
    pattern,
    replacement,
    flags,
    matchCount,
    matchIndex,
  } = props;

  return {
    props: {
      operationType,
      selectedColumns: selectedColumns || [],
      pattern: pattern || "",
      replacement: replacement || "",
      flags: flags || "g",
      matchCount: matchCount || "",
      matchIndex: matchIndex || "",
    },
  };
};
