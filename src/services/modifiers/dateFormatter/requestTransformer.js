export default async (req) => {
  const { props } = req.original;
  const { formatType, customPattern, detailLevel } = props;

  return {
    props: {
      formatType: formatType || "iso",
      customPattern: customPattern || "",
      detailLevel: detailLevel || "date",
    },
  };
};
