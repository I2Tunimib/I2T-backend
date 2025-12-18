export default async (req) => {
  const { props } = req.original;
  const { operationType, columnToJoin, separator, selectedColumns, renameJoinedColumn, renameNewColumnSplit,
    splitMode, extractPortion, splitRenameMode } = props;

  return {
    props: {
      operationType: operationType,
      columnToJoin: columnToJoin || [],
      separator: separator || "; ",
      selectedColumns: selectedColumns || [],
      renameJoinedColumn: renameJoinedColumn || "",
      renameNewColumnSplit: renameNewColumnSplit || "",
      splitMode: splitMode || "",
      extractPortion: extractPortion || "",
      splitRenameMode: splitRenameMode || "",
    },
  };
};
