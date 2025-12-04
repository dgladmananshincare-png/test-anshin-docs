#!/usr/bin/env node
/*
  Lightweight YAML linter for Docusaurus docs.
  - Checks all .md files in docs/
  - Reports YAML syntax errors, duplicate keys, tab usage, and indentation issues.
  Usage: node scripts/yamllint.js
*/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function getAllMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  });
  return results;
}

function extractFrontmatter(src) {
  if (!src.startsWith('---\n')) return null;
  const end = src.indexOf('\n---\n');
  if (end === -1) return null;
  return src.slice(4, end);
}

function lintYaml(yamlText, filePath) {
  let errors = [];
  // Check for tabs
  if (/\t/.test(yamlText)) {
    errors.push('Tabs found (use spaces for indentation)');
  }
  // Check for indentation (should be 2 spaces)
  yamlText.split('\n').forEach((line, idx) => {
    if (/^\s+/.test(line) && !/^  +/.test(line)) {
      errors.push(`Line ${idx + 1}: Indentation not 2 spaces`);
    }
  });
  // Check for duplicate keys
  try {
    yaml.load(yamlText, { json: false, schema: yaml.DEFAULT_SCHEMA });
  } catch (e) {
    errors.push(`YAML parse error: ${e.message}`);
  }
  return errors;
}

function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const files = getAllMarkdownFiles(docsDir);
  let hasErrors = false;
  files.forEach((file) => {
    const src = fs.readFileSync(file, 'utf8');
    const fm = extractFrontmatter(src);
    if (!fm) return;
    const errors = lintYaml(fm, file);
    if (errors.length > 0) {
      hasErrors = true;
      console.log(`YAML errors in ${file}:`);
      errors.forEach((err) => console.log('  -', err));
    }
  });
  if (!hasErrors) {
    console.log('YAML lint: All files passed.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
