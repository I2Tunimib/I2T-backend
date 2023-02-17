import chalk from "chalk";
import logSymbols from "log-symbols";
import { ExtenderSchema, ReconciliatorSchema } from "../schemas/service";


/**
 * Create a reconciliator by parsing the index file
 */
export const createReconciliator = (serviceConfig) => {
  return ReconciliatorSchema.safeParse(serviceConfig);
}

/**
 * Create an extender by parsing the index file
 */
export const createExtender = (serviceConfig) => {
  return ExtenderSchema.safeParse(serviceConfig);
}

/**
 * Print services
 */
export const printAvailableServices = (title, services) => {
  const { available, errors } = services;
  const keys = Object.keys(available).concat(Object.keys(errors)).sort();

  console.log(chalk.bold(chalk.blueBright(`\n${title}`)))
  console.log(keys.reduce((acc, service) => `${acc}\n${service in available ? `${logSymbols.success} ${service}` : `${logSymbols.error} ${service}\n${chalk.red(getFormattedZodError(errors[service].issues))}`}`, ''));
}

/**
 * Show path and value error
 */
export const getFormattedZodError = (errors) => {
  return errors.reduce((acc, error, index) => `${acc}${index + 1}. ${error.path.join('.')}: ${error.message}\n`, 'Errors:\n')
}