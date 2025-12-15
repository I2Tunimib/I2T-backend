export default async (req) => {
  const { props } = req.original;
  const { separator, selectedColumns } = props;

  return {
    props: {
      separator: separator || "; ",
      selectedColumns: selectedColumns || [],
    },
  };
};
