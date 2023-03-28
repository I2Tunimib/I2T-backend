import config from './index';


function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function cleanLabel(label){
  return replaceAll(label, /[*+?^$&{}()|[\]\\]/g, '').toLowerCase();
}


export default async (req, res) => {

  const { items } = req.processed;
  //console.log(res)
  //console.log(items)
  const response = Object.keys(items).flatMap((label) => {
    const labelClean = cleanLabel(String(label))
    
    const metadata = res[labelClean].map(({ id, ...rest }) => ({
      id: `wiki:${id}`,
      name: {
        value:"",
        uri: ""
      },
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
