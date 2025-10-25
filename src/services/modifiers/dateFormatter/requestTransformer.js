export default async (req) => {
  const { props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode, columnToJoin, joinColumns, selectedColumns, columnType, separator } = props;

  return {
    props: {
      formatType: formatType || "iso",
      customPattern: customPattern || "",
      detailLevel: detailLevel || "date",
      outputMode: outputMode,
      columnToJoin: columnToJoin,
      joinColumns: joinColumns || false,
      selectedColumns: selectedColumns || [],
      columnType: columnType || "unknown",
      separator: separator || "; ",
    },
  };
};
