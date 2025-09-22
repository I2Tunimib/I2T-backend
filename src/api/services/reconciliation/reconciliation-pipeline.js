import config from "../../../config/index.js";
import { mapToUnique } from "./utils.js";

const { reconcilers } = config;

const reconciliationPipeline = async (reqBody) => {
  const { serviceId, ...rest } = reqBody;

  const service = reconcilers[serviceId];

  if (!service) {
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
    original: { items, props },
    ...(info.private.processRequest && {
      processed: { items: mapToUnique(items), props },
    }),
  };

  // get response from service
  const serviceResponse = await requestTransformer(req);

  // transform response to app format
  const transformedResponse = await responseTransformer(req, serviceResponse);

  return transformedResponse;
};

export default reconciliationPipeline;
