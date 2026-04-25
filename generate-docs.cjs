const fs = require('fs');
const path = require('path');

const BASE_SERVICES_DIR = path.join(__dirname, 'src/services');
const CATEGORIES = ['reconcilers', 'extenders', 'modifiers'];
const GENERATED_ROOT = path.join(__dirname, 'generated_docs');
const OUTPUT_BASE_DIR = path.join(GENERATED_ROOT, 'discover-services');

if (fs.existsSync(GENERATED_ROOT)) {
  fs.rmSync(GENERATED_ROOT, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });

const mainCategoryJson = {
  label: "Discover Services",
  position: 2,
  link: {
    type: 'generated-index',
    description: "Explore all the services available in the I2T platform."
  }
};
fs.writeFileSync(
  path.join(OUTPUT_BASE_DIR, '_category_.json'),
  JSON.stringify(mainCategoryJson, null, 2)
);

function generateMarkdown() {
  CATEGORIES.forEach(category => {
    const categoryPath = path.join(BASE_SERVICES_DIR, category);

    if (!fs.existsSync(categoryPath)) {
      console.warn(`Folder not found: ${categoryPath}`);
      return;
    }

    const categoryOutputDir = path.join(OUTPUT_BASE_DIR, category);
    fs.mkdirSync(categoryOutputDir, { recursive: true });

    const categoryJson = {
      label: category.charAt(0).toUpperCase() + category.slice(1),
      link: { type: 'generated-index' }
    };
    fs.writeFileSync(
      path.join(categoryOutputDir, '_category_.json'),
      JSON.stringify(categoryJson, null, 2)
    );

    const services = fs.readdirSync(categoryPath);

    services.forEach(serviceFolder => {
      const indexPath = path.join(categoryPath, serviceFolder, 'index.js');

      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');

        const nameMatch = content.match(/name:\s*"(.*?)"/);
        const descBlockMatch = content.match(/description:\s*(['"][\s\S]*?)(?=\s*,\s*\n|\s*,?\s*uri:)/);

        if (nameMatch && descBlockMatch) {
          const name = nameMatch[1];
          let rawDescription = descBlockMatch[1];

          let description = rawDescription
            .replace(/['"]\s*\+\s*['"]/g, '')
            .replace(/^['"]|['"]$/g, '')
            .replace(/\\n/g, '\n')
            .trim();

          const mdContent = `---
title: ${name}
sidebar_label: ${name}
---

# ${name}

> **Service Category:** ${category.toUpperCase()}

### Description
${description}

---
:::info
This documentation is automatically generated from the backend source code.
:::
`;

          const fileName = `${serviceFolder}.md`;
          fs.writeFileSync(path.join(categoryOutputDir, fileName), mdContent);
          console.log(`[${category}] Generated: ${fileName}`);
        }
      }
    });
  });
}

generateMarkdown();
