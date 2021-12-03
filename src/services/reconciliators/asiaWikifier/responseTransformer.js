import config from './index';

const { uri } = config.public;

export default async (req, res) => {
  const response = Object.keys(res).map((id) => {
    const metadata = res[id].result.map((metaItem) => ({
      ...metaItem,
      name: {
        value: metaItem.name,
        uri: `${uri}/${metaItem.id}`
      }
    }))

    return {
      id,
      metadata
    }
  });
  return response;
}

