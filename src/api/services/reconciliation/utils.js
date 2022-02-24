export const mapToUnique = (items) => {
  return items.reduce((acc, { id: cellId, label }) => {
    if (label in acc) {
      acc[label] = [...acc[label], cellId]
    } else {
      acc[label] = [cellId];
    }
    return acc;
  }, {});
}