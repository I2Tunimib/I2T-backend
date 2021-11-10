import { ExtensionRequestTransformer, ExtensionResponseTransformer, postTransform } from './extension-transformers';
import CONFIG from "../../config";

const { SERVICES_CONFIG } = CONFIG;

const extensionPipeline = async (reqBody) => {
  const { extenderId, ...rest } = reqBody;

  const extender = SERVICES_CONFIG.extenders.find((item) => item.id === extenderId);

  if (!extender) {
    // if an extender isn't found throw an error. (extenderId probably is not sent correctly by client)
    throw new Error('Invalid extender service');
  }

  const { serviceKey } = extender;
  const transformReqFn = ExtensionRequestTransformer[serviceKey];
  const transformResFn = ExtensionResponseTransformer[serviceKey];
  
  if (!transformReqFn) {
    // get transform request function. If not found throw error (user probably didn't implement a transform function)
    throw new Error('No transformer request function found')
  }
  if (!transformResFn) {
    // get transform response function. If not found throw error (user probably didn't implement a transform function)
    throw new Error('No transformer response function found')
  }

  // get response from service
  const serviceResponse = await transformReqFn(rest);

  // transform response to app format
  const transformedResponse = await transformResFn(serviceResponse);

  // post transform and return final response
  return postTransform(transformedResponse);
}

export default extensionPipeline;
