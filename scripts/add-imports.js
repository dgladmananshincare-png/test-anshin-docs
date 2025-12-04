#!/usr/bin/env node
/*
  Add/remove imports based on frontmatter, then inject imports immediately after YAML frontmatter.

  Rules:
  - If subtitle is null or '' -> ensure "import Subtitle ..." is removed if present.
  - If subtitle has a non-empty value -> queue "import Subtitle from '@site/src/components/Subtitle';".
  - If noindex is false -> ensure "import Head ..." is removed if present.
  - If noindex is true -> queue "import Head from '@docusaurus/Head';".

  Idempotent: will not duplicate imports; will remove when rule says so.

  Usage:
    node scripts/add-imports.js path/to/file.md [more.md ...]

  Dependencies:
    npm install js-yaml
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const IMPORT_SUBTITLE = "import Subtitle from '@site/src/components/Subtitle';";
const IMPORT_HEAD = "import Head from '@docusaurus/Head';";

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[add-imports] Failed to read ${p}:`, e.message);
    process.exitCode = 1;
    return null;
  }
}

function writeFileSafe(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  } catch (e) {
    console.error(`[add-imports] Failed to write ${p}:`, e.message);
    process.exitCode = 1;
  }
}

function parseFrontmatterAndBody(src) {
  const fmStart = src.indexOf('---\n');
  if (fmStart !== 0) {
    return { fm: {}, fmBlock: '', body: src, hasFm: false };
  }
  const fence = '\n---\n';
  const end = src.indexOf(fence);
  if (end === -1) {
    return { fm: {}, fmBlock: '', body: src, hasFm: false };
  }
  const fmRaw = src.slice(4, end); // skip initial '---\n'
  const fmBlock = src.slice(0, end + fence.length);
  const body = src.slice(end + fence.length);
  let fm = {};
  try {
    const parsed = yaml.load(fmRaw);
    if (parsed && typeof parsed === 'object') fm = parsed;
  } catch (e) {
    console.warn('[add-imports] YAML parse warning:', e.message);
  }
  return { fm, fmBlock, body, hasFm: true };
}

function stripExistingManagedImports(body) {
  const lines = body.split(/\n/);
  const isImportLine = (l) => /^(import\s+.+from\s+['"]).+(['"];?)$/.test(l.trim());
  const filtered = lines.filter((l) => {
    const t = l.trim();
    if (t === IMPORT_SUBTITLE) return false;
    if (t === IMPORT_HEAD) return false;
    return true;
  });
  return filtered.join('\n');
}

function ensureImportsAfterFrontmatter(fmBlock, body, importsToInject) {
  // Remove any of our managed imports from the body first to avoid duplicates
  const cleanedBody = stripExistingManagedImports(body);

  // Normalize leading whitespace: we will manage spacing after frontmatter ourselves
  const bodyTrimmed = cleanedBody.replace(/^\n+/, '');

  const importBlock = importsToInject.join('\n');

  if (importBlock.length === 0) {
    // No imports to inject; ensure exactly one blank line after frontmatter
    return fmBlock + '\n' + bodyTrimmed;
  }

  // Decide separator after import block:
  // - If the next non-empty line is an import, keep imports contiguous (single newline)
  // - Otherwise ensure a blank line (two newlines) before non-import content
  const lines = bodyTrimmed.split('\n');
  const first = lines[0] || '';
  const isImport = /^\s*import\s+.+from\s+['"].+['"];?\s*$/.test(first);
  const afterImportSep = isImport ? '\n' : '\n\n';

  return fmBlock + '\n' + importBlock + afterImportSep + bodyTrimmed;
}

function valueIsEmpty(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function processFile(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.log(`[skip] not found: ${filePath}`);
    return;
  }
  const raw = readFileSafe(abs);
  if (raw == null) return;

  const { fm, fmBlock, body, hasFm } = parseFrontmatterAndBody(raw);
  if (!hasFm) {
    console.log(`[skip] no frontmatter: ${filePath}`);
    return;
  }

  const imports = [];

  // Subtitle rule
  if (!valueIsEmpty(fm.subtitle)) {
    // queue Subtitle import
    imports.push(IMPORT_SUBTITLE);
  } else {
    // ensure removal if present (handled by stripExistingManagedImports)
  }

  // noindex rule
  if (fm.noindex === true) {
    imports.push(IMPORT_HEAD);
  } else {
    // ensure removal if present
  }

  // Deduplicate imports to inject
  const uniqueImports = Array.from(new Set(imports));
  const out = ensureImportsAfterFrontmatter(fmBlock, body, uniqueImports);
  writeFileSafe(abs, out);
  console.log(`[add-imports] Updated ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/add-imports.js path/to/file.md [more.md ...]');
    process.exit(1);
  }
  for (const p of args) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) {
      console.warn(`[add-imports] Skipping missing file: ${abs}`);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      console.warn(`[add-imports] Skipping directory: ${abs}`);
      continue;
    }
    processFile(abs);
  }
}

main();
