import fs from "fs";
import CircularJSON from "circular-json";

const asyncMiddleware = fn => (...args) => {
  const fnReturn = fn(...args);
  const next = args[args.length-1];
  return Promise.resolve(fnReturn).catch(next);
};

export default asyncMiddleware;
