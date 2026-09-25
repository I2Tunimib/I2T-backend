export default async (req) => {
  const { props } = req.original;
  const { operationType, columnToJoin, separator, selectedColumns, renameMode, renameJoinedColumn, renameNewColumnSplit,
    splitMode, splitDirection } = props;

  return {
    props: {
      operationType: operationType,
      columnToJoin: columnToJoin || [],
      separator: separator || "; ",
      selectedColumns: selectedColumns || [],
      renameMode: renameMode || "",
      renameJoinedColumn: renameJoinedColumn || "",
      renameNewColumnSplit: renameNewColumnSplit || "",
      splitMode: splitMode || "",
      splitDirection: splitDirection || "",
    },
  };
};
