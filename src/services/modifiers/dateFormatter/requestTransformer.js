export default async (req) => {
  const { props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode, joinColumns, selectedColumns, columnType, separator } = props;

  return {
    props: {
      formatType: formatType || "iso",
      customPattern: customPattern || "",
      detailLevel: detailLevel || "date",
      outputMode: outputMode,
      joinColumns: joinColumns || false,
      selectedColumns: selectedColumns || [],
      columnType: columnType || "unknown",
      separator: separator || "; ",
    },
  };
};
