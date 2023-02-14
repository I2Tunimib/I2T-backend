import { Command, Argument } from 'commander';
import inquirer from 'inquirer';
import { newCmd } from './commands/generate.js';
import { validateEmpty } from './utils/validateEmpty.js';
import { validateRelativeUrl } from './utils/validateRelativeUrl.js';

const program = new Command();

const prompts = {
  reconciliator: [
    { type: 'input', name: 'prefix', message: `Prefix used for the conciled resources (e.g., geo, dbp, wkd)` },
    { type: 'input', name: 'uri', message: `Resources URI (e.g., https://www.wikidata.org/wiki/)` },
  ],
  extender: []
}

program
  .name('semtui')
  .description('CLI to generate a new service')
  .version('1.0.0');

program.command('new')
  .description('Generate a new service.')
  .action(async (service, options) => {
    const commonAnswers = await inquirer
      .prompt([
        { type: 'list', name: 'type', choices: ['reconciliator', 'extender'], message: `Type of service` },
        { type: 'input', name: 'name', message: `Service name`, validate: validateEmpty },
        { type: 'input', name: 'description', message: `Description (this is what the user will see client side)` },
        { type: 'input', name: 'relativeUrl', message: `Relative url (defaults to the service name)? (e.g. /service-name)`, validate: validateRelativeUrl },
      ])
    inquirer
      .prompt(prompts[commonAnswers.type])
      .then((options) => {
        const resolvedOptions = {
          ...commonAnswers,
          ...options,
          relativeUrl: options.relativeUrl ? options.relativeUrl : `/${options.name}`
        }
        newCmd(resolvedOptions)
        // Use user feedback for... whatever!!
      })
      .catch((error) => {
        console.log(error);
        if (error.isTtyError) {

          // Prompt couldn't be rendered in the current environment
        } else {
          // Something else went wrong
        }
      });


  });

program.parse();

