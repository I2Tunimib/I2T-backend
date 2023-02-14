import config from './index';

const { endpoint } = config.private;

export default async (req) => {
  const { items } = req.processed;

  // return data obtained from service
}