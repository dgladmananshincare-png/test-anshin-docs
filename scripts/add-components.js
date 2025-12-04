#!/usr/bin/env node
/*
  Add/remove components based on frontmatter, then inject components at the top of the body
  (just after the initial import block to keep MDX import-first correctness).

  Rules:
  - If noindex is false -> remove the specific Head robots block if present.
  - If noindex is true -> queue the Head robots block for injection.
  - If subtitle is null or '' -> remove <Subtitle text={frontMatter.subtitle} /> everywhere.
  - If subtitle is non-empty -> queue <Subtitle text={frontMatter.subtitle} /> for injection.

  Injection order: Head (if any) then Subtitle (if any), inserted after any contiguous import lines
  immediately following the YAML frontmatter fence. Idempotent.

  Usage:
    node scripts/add-components.js path/to/file.md [more.md ...]

  Dependencies:
    npm install js-yaml
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HEAD_BLOCK = `<Head>
  <meta name="robots" content="noindex, nofollow" />
</Head>`;
const SUBTITLE_LINE = '<Subtitle text={frontMatter.subtitle} />';

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[add-components] Failed to read ${p}:`, e.message);
    process.exitCode = 1;
    return null;
  }
}

function writeFileSafe(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  } catch (e) {
    console.error(`[add-components] Failed to write ${p}:`, e.message);
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
  const fmRaw = src.slice(4, end);
  const fmBlock = src.slice(0, end + fence.length);
  const body = src.slice(end + fence.length);
  let fm = {};
  try {
    const parsed = yaml.load(fmRaw);
    if (parsed && typeof parsed === 'object') fm = parsed;
  } catch (e) {
    console.warn('[add-components] YAML parse warning:', e.message);
  }
  return { fm, fmBlock, body, hasFm: true };
}

function valueIsEmpty(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function stripManagedComponents(body) {
  let out = body;
  // Remove any exact Subtitle usage lines (with optional trailing spaces and a trailing blank line)
  const subtitleRe = /\n?<Subtitle\s+text=\{frontMatter\.subtitle\}\s*\/>\s*\n?/g;
  out = out.replace(subtitleRe, (m) => (m.startsWith('\n') ? '\n' : ''));

  // Remove the specific Head block for robots noindex,nofollow (be flexible with spacing)
  const headRe = /\n?<Head>\s*<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']\s*\/>\s*<\/Head>\s*\n?/gs;
  out = out.replace(headRe, (m) => (m.startsWith('\n') ? '\n' : ''));

  return out;
}

function findImportBlockEndIndex(lines) {
  // Scan from the top, allowing blank lines within the header, and track the last import line.
  // Stop at the first non-blank, non-import line. Return insertion index immediately after
  // the last detected import line, or 0 if no imports were found before content.
  let i = 0;
  let lastImportIdx = -1;
  const isImport = (s) => /^\s*import\s+.+from\s+['"].+['"];?\s*$/.test(s);
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (isImport(line)) {
      lastImportIdx = i;
      i++;
      continue;
    }
    // First non-blank, non-import line -> stop scanning
    break;
  }
  return lastImportIdx >= 0 ? lastImportIdx + 1 : 0;
}

function injectComponentsAfterImports(fmBlock, body, components) {
  const lines = body.split(/\n/);
  const insert = components.join('\n');
  if (insert.length === 0) return fmBlock + body; // nothing to inject

  let insertionIndex = findImportBlockEndIndex(lines);

  // Normalize the whitespace after the import block (or after frontmatter if no imports):
  // Remove any blank lines immediately following the imports, then add exactly one.
  while (insertionIndex < lines.length && lines[insertionIndex].trim() === '') {
    lines.splice(insertionIndex, 1);
  }
  // If there are no imports and the first line isn't blank, add a blank line at the very top
  if (insertionIndex === 0 && (lines[0] && lines[0].trim() !== '')) {
    lines.splice(0, 0, '');
    insertionIndex = 1;
  } else {
    // Ensure exactly one blank line after imports
    lines.splice(insertionIndex, 0, '');
    insertionIndex += 1;
  }

  // Insert components and ensure a trailing blank line after the block for readability
  lines.splice(insertionIndex, 0, insert);
  lines.splice(insertionIndex + 1, 0, '');

  return fmBlock + lines.join('\n');
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

  // Remove any managed components first
  const cleanedBody = stripManagedComponents(body);

  const components = [];
  // Head block based on noindex
  if (fm.noindex === true) {
    components.push(HEAD_BLOCK);
  }
  // Subtitle based on substring presence
  if (!valueIsEmpty(fm.subtitle)) {
    components.push(SUBTITLE_LINE);
  }

  const out = injectComponentsAfterImports(fmBlock, cleanedBody, components);
  writeFileSafe(abs, out);
  console.log(`[add-components] Updated ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/add-components.js path/to/file.md [more.md ...]');
    process.exit(1);
  }
  for (const p of args) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) {
      console.warn(`[add-components] Skipping missing file: ${abs}`);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      console.warn(`[add-components] Skipping directory: ${abs}`);
      continue;
    }
    processFile(abs);
  }
}

main();
