export default async (req) => {
  const { props } = req.original;
  const { operationType, columnToJoin, separator, selectedColumns, renameJoinedColumn, renameNewColumnSplit,
    splitMode, binaryDirection, splitRenameMode } = props;

  return {
    props: {
      operationType: operationType,
      columnToJoin: columnToJoin || [],
      separator: separator || "; ",
      selectedColumns: selectedColumns || [],
      renameJoinedColumn: renameJoinedColumn || "",
      renameNewColumnSplit: renameNewColumnSplit || "",
      splitMode: splitMode || "",
      binaryDirection: binaryDirection || "",
      splitRenameMode: splitRenameMode || "",
    },
  };
};
