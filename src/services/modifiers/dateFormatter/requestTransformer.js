export default async (req) => {
  const { props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode } = props;

  return {
    props: {
      formatType: formatType || "iso",
      customPattern: customPattern || "",
      detailLevel: detailLevel || "date",
      outputMode: outputMode,
    },
  };
};
