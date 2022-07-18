import config from './index';

const { uri } = config.public;

function cleanLabel(label) {
  return label.replace(/&/g, '').replace(/\s*/g, ' ')
}


export default async (req, res) => {

  const { items } = req.processed;


  const response = Object.keys(items).flatMap((label) => {
    const metadata = res[cleanLabel(label)].result.map(({ id, ...rest }) => ({
      id: `wd:${id}`,
      ...rest
    }))

    return items[label].map((cellId) => ({
      id: cellId,
      metadata
    }))
  });

  // const response = Object.keys(res).map((id) => {
  //   const metadata = res[id].result.map(({ features, ...metaItem }) => ({
  //     ...metaItem,
  //     name: {
  //       value: metaItem.name,
  //       uri: `${uri}${metaItem.id}`
  //     }
  //   }));

  //   return {
  //     id,
  //     metadata
  //   };
  // })
  return response;
}