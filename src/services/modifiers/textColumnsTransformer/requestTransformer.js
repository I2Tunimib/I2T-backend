export default async (req) => {
  const { props } = req.original;
  const { operationType, columnToJoinSplit, separator, selectedColumns, renameNewColumn } = props;

  return {
    props: {
      operationType: operationType,
      columnToJoinSplit: columnToJoinSplit || [],
      separator: separator || "; ",
      selectedColumns: selectedColumns || [],
      renameNewColumn: renameNewColumn || "",
    },
  };
};
