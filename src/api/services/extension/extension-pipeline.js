import config from "../../../config/index.js";
import { postTransform, getUniqueMaps } from "./utils.js";

const { extenders, reconcilers, errors } = config;

const getPublicConfiguration = (services) => {
  return Object.keys(services).map((key) => ({
    id: key,
    ...services[key].info.public,
  }));
};

const extensionPipeline = async (reqBody) => {
  const { serviceId, ...rest } = reqBody;

  const service = extenders[serviceId];

  if (!service) {
    // if an extender isn't found throw an error. (extenderId probably is not sent correctly by client)
    throw new Error("Service not found");
  }

  const { info, requestTransformer, responseTransformer } = service;

  if (!requestTransformer) {
    // get transform request function. If not found throw error (user probably didn't implement a transform function)
    throw new Error("No transformer request function found");
  }
  if (!responseTransformer) {
    // get transform response function. If not found throw error (user probably didn't implement a transform function)
    throw new Error("No transformer response function found");
  }

  const { items, ...props } = rest;

  const req = {
    // original request
    original: { items, props },
    // processed request with unique items
    ...(info.private.processRequest && {
      processed: { items: getUniqueMaps(items), props },
    }),
    config: {
      reconcilers: getPublicConfiguration(reconcilers),
      extenders: getPublicConfiguration(extenders),
      errors,
    },
  };

  // get response from service
  const serviceResponse = await requestTransformer(req);

  // transform response to app format
  const transformedResponse = await responseTransformer(req, serviceResponse);

  // post transform and return final response
  // return postTransform(transformedResponse);
  return transformedResponse;
};

export default extensionPipeline;
