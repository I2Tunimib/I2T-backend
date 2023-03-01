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
  const title = 'Errors:\n';

  const errorsArray = errors.map((error, index) => {
    const errorPath = error.path.join('.');
    // intelligently show union errors
    if (error.code === 'invalid_union') {
      const allIssues = error.unionErrors.flatMap((unionError) => {
        return unionError.issues;
      })
      const pathMinLen = Math.min(...allIssues.map((issue) => issue.path.length));
      const pathMaxLen = Math.max(...allIssues.map((issue) => issue.path.length));

      const filteredIssues = allIssues.filter((issue) => {
        if (issue.path.join('.').startsWith(errorPath)) {
          if (pathMinLen === pathMaxLen) {
            return true;
          }
        }
        return issue.path.length > pathMinLen
      })
      const unionErrors = filteredIssues
        .map((issue) => ` ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')

      return unionErrors;
    }

    return ` ${errorPath}: ${error.message}`
  });

  return `${title}${errorsArray.join('\n')}`
}