export default async (req) => {
  const { props } = req.original;
  const { operationType, selectedColumns } = props;

  return {
    props: {
      operationType: operationType,
      selectedColumns: selectedColumns || [],
    }
  };
};
