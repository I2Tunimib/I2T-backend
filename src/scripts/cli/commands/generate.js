import fs from 'fs';

export const newCmd = ({ type, ...options }) => {
  const templatePath = `./src/scripts/cli/templates/${type}`;
  const destPath = `./src/services/${type}s/${options.name}`;

  if (fs.existsSync(destPath)) {
    console.log(`A service with name '${options.name}' already exists!`)
    process.exit(0);
  }

  fs.mkdirSync(destPath);

  const templates = fs.readdirSync(templatePath);

  templates.forEach((template) => {
    let templateContent = fs.readFileSync(`${templatePath}/${template}`, { encoding: 'utf-8' });
    Object.keys(options).forEach((opt) => {
      templateContent = templateContent.replace(`{${opt}}`, options[opt]);
    })
    fs.writeFileSync(`${destPath}/${template}`, templateContent);
  })


}