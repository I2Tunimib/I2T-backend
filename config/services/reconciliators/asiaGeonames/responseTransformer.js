export default async (req, res) => {
  const response = Object.keys(res).map((id) => ({
    id,
    metadata: res[id].result
  }));
  return response;
}