export default async (req, res) => {
  const { items } = req.processed;

  const response = Object.keys(res).flatMap((label) => {
    const metadata = res[label].result.map(({ id, ...rest }) => ({
      id: `geo:${id}`,
      ...rest
    }))

    return items[label].map((cellId) => ({
      id: cellId,
      metadata
    }))
  });

  return response;
}