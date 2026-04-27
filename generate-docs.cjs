const fs = require('fs');
const path = require('path');

const BASE_SERVICES_DIR = path.join(__dirname, 'src/services');
const TABLE_SERVICES_DIR = path.join(__dirname, 'src/api/services/tables');
const GENERATED_ROOT = path.join(__dirname, 'generated_docs');
const OUTPUT_BASE_DIR = path.join(GENERATED_ROOT, 'discover-services');

const CATEGORY_INTRO = {
  modifiers: "Modifiers are services that process and transform data at the column level.",
  reconcilers: "Reconcilers are services responsible for aligning or enriching tabular data with semantic metadata.",
  extenders: "Services that add complementary data or attributes to existing resources.",
  'generative-ai': "Generative AI services leverage Large Language Models (LLMs) to perform complex tasks like intelligent cleaning, semantic reasoning, and automated data enrichment through natural language prompts.",
  compliance: "Compliance services evaluate your data against privacy standards and regulatory frameworks (such as GDPR) to ensure data quality and legal safety."
};

const docsContent = {
  reconcilers: "",
  extenders: "",
  modifiers: "",
  'generative-ai': "",
  compliance: ""
};

function extractDescription(content) {
  const start = content.indexOf('description:');
  if (start === -1) return null;

  let i = start + 'description:'.length;

  while (/\s/.test(content[i])) i++;

  let result = '';

  while (i < content.length) {
    const quote = content[i];

    if (!['"', "'", '`'].includes(quote)) break;

    i++;

    let escaped = false;

    while (i < content.length) {
      const char = content[i];

      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
        result += char;
      } else if (char === quote) {
        break;
      } else {
        result += char;
      }

      i++;
    }

    i++;

    result += ' ';

    while (/\s/.test(content[i])) i++;

    if (content[i] !== '+') break;

    i++;
    while (/\s/.test(content[i])) i++;
  }

  return result;
}

function cleanDescription(raw) {
  return raw
    .replace(/^`|`$/g, '')

    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')

    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

    .replace(/<(div|p|span|section)[^>]*>/gi, '')
    .replace(/<\/(div|p|span|section)>/gi, '\n\n')

    .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '%%ENDLIST%%')

    .replace(/<br\s*\/?>/gi, '\n')

    .split('\n')
    .map(line => line.trim())
    .join('\n')

    .replace(/(\*\*Input\*\*:[^\n]+)/g, '$1  ')
    .replace(/%%ENDLIST%%\n\*\*Output\*\*:/g, '\n\n**Output**:')
    .replace(/\n+\*\*Output\*\*:/g, '\n**Output**:')

    .replace(/%%ENDLIST%%/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')

    .replace(/PLACEHOLDER_COMPLIANCE_GIF/g, '![Compliance GIF](/img/compliance.gif)')
    .trim();
}

function processServiceFile(filePath, defaultCategory) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');

  const nameMatch = content.match(/name:\s*["'](.*?)["']/);
  const groupMatch = content.match(/group:\s*"(.*?)"/);

  const rawDescription = extractDescription(content);

  if (!nameMatch || !rawDescription) return;

  const name = nameMatch[1];

  const skipList = ['asiaKeywordsMatcher', 'asiaWikifier', 'atokaMatch2', 'atokaPeople', 'asiaPeopleExtender'];
  if (skipList.some(skip => filePath.includes(skip))) return;

  const description = cleanDescription(
    rawDescription
      .replace(/"\s*\+\s*`/g, '')
      .replace(/`\s*\+\s*"/g, '')
  );

  const group = groupMatch ? groupMatch[1] : "";

  let targetCat = defaultCategory;
  if (group === "Gen AI") targetCat = 'generative-ai';
  if (group === "Compliance") targetCat = 'compliance';

  docsContent[targetCat] += `## ${name}\n\n${description}\n\n---\n\n`;
}

function generateMarkdown() {
  if (fs.existsSync(GENERATED_ROOT)) {
    fs.rmSync(GENERATED_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });

  ['reconcilers', 'extenders', 'modifiers'].forEach(cat => {
    const catPath = path.join(BASE_SERVICES_DIR, cat);
    if (fs.existsSync(catPath)) {
      fs.readdirSync(catPath).forEach(folder => {
        processServiceFile(path.join(catPath, folder, 'index.js'), cat);
      });
    }
  });

  if (fs.existsSync(TABLE_SERVICES_DIR)) {
    fs.readdirSync(TABLE_SERVICES_DIR).forEach(file => {
      processServiceFile(path.join(TABLE_SERVICES_DIR, file), 'compliance');
    });
  }

  Object.keys(docsContent).forEach(cat => {
    if (docsContent[cat].trim().length > 0) {
      let displayTitle = cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (cat === 'generative-ai') displayTitle = "Generative AI Services";

      const fileContent = `---
title: "${displayTitle}"
sidebar_label: "${displayTitle}"
---

# ${displayTitle}

${CATEGORY_INTRO[cat] || ""}

---

${docsContent[cat]}`;

      fs.writeFileSync(path.join(OUTPUT_BASE_DIR, `${cat}.md`), fileContent);
    }
  });

  const mainCategoryJson = { label: "Discover Services", position: 2 };
  fs.writeFileSync(path.join(OUTPUT_BASE_DIR, '_category_.json'), JSON.stringify(mainCategoryJson, null, 2));
}

generateMarkdown();
