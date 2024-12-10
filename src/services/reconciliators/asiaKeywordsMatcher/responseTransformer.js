import config from './index.js';

const { uri } = config.public;

export default async (req, res) => {
  const { items } = req.processed;


  const response = Object.keys(res).flatMap((label) => {
    const metadata = res[label].result.map(({ id, ...rest }) => ({
      id: `dbp:${id}`,
      ...rest
    }))

    return items[label].map((cellId) => ({
      id: cellId,
      metadata
    }))
  });

  return response;
}
