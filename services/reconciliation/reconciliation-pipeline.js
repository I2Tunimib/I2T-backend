import config from "../../config/index";

const { reconciliators } = config;

const reconciliationPipeline = async (reqBody) => {
  const { serviceId, ...rest } = reqBody;

  const service = reconciliators[serviceId];

  if (!service) {
    throw new Error('Service not found');
  }

  const { requestTransformer, responseTransformer } = service;
  
  if (!requestTransformer) {
    // get transform request function. If not found throw error (user probably didn't implement a transform function)
    throw new Error('No transformer request function found')
  }
  if (!responseTransformer) {
    // get transform response function. If not found throw error (user probably didn't implement a transform function)
    throw new Error('No transformer response function found')
  }

  // get response from service
  const serviceResponse = await requestTransformer(rest);

  // transform response to app format
  const transformedResponse = await responseTransformer(rest, serviceResponse);

  return transformedResponse;
}

export default reconciliationPipeline;
