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
const { TOP_MARKER_PREFIX, BOTTOM_MARKER_PREFIX, TOP_MARKER, BOTTOM_MARKER } = require('./sanitize-md');
function validateMarkersOrExit(body, fileLabel = '') {
  const topCount = (body.match(/^\s*<!--@.*$/gm) || []).length;
  const bottomCount = (body.match(/^\s*<!--#.*$/gm) || []).length;
  if (topCount > 1 || bottomCount > 1) {
    console.error(`[add-components] Marker duplication detected ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
  if ((topCount === 1 && bottomCount === 0) || (topCount === 0 && bottomCount === 1)) {
    console.error(`[add-components] Marker mismatch (one present without the other) ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
}

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
  // Ensure markers; if missing, insert empty region at top of body
  let workingBody = body;
  const hasTop = /^\s*<!--@/.test(workingBody);
  const hasBottom = /^([\s\S]*?)<!--#/.test(workingBody);
  validateMarkersOrExit(workingBody, 'body');
  if (!hasTop || !hasBottom) {
    // Insert markers immediately after frontmatter
    workingBody = `${TOP_MARKER}\n${BOTTOM_MARKER}\n` + workingBody.trimStart();
  }

  // Remove everything between markers to rebuild from scratch
  const markerLines = workingBody.split('\n');
  let startLine = -1, endLine = -1;
  for (let i = 0; i < markerLines.length; i++) {
    const line = markerLines[i];
    if (startLine === -1 && line.trim().startsWith(TOP_MARKER_PREFIX)) startLine = i;
    if (endLine === -1 && line.trim().startsWith(BOTTOM_MARKER_PREFIX)) endLine = i;
  }
  if (startLine === -1 || endLine === -1 || endLine < startLine) {
    console.error('[add-components] Marker positions invalid.');
    process.exit(1);
  }
  const startIdx = markerLines.slice(0, startLine + 1).join('\n').length;
  const endOfBottomLine = markerLines.slice(0, endLine + 1).join('\n').length;
  const before = workingBody.slice(0, startIdx);
  const remainder = workingBody.slice(endOfBottomLine);

  const insert = components.join('\n');
  // Build fresh region: top marker, blank line, keep existing imports just above components if present
  // We place components after any import lines found immediately after the top marker
  const regionLines = workingBody.slice(startIdx, markerLines.slice(0, endLine).join('\n').length).split('\n').map((l) => l);
  // Normalize: ensure a blank line after any imports
  const importEnd = findImportBlockEndIndex(regionLines);
  // Remove trailing blanks after imports
  while (importEnd < regionLines.length && regionLines[importEnd].trim() === '') {
    regionLines.splice(importEnd, 1);
  }
  // Ensure exactly one blank line after imports
  regionLines.splice(importEnd, 0, '');
  // Insert components after imports
  if (insert.length > 0) {
    regionLines.splice(importEnd + 1, 0, insert);
    // trailing blank for readability
    regionLines.splice(importEnd + 2, 0, '');
  }
  // Rebuild
  const rebuiltRegion = before + '\n' + regionLines.filter((l, i) => !(i === 0 && l === '')).join('\n') + '\n' + BOTTOM_MARKER;
  return fmBlock + rebuiltRegion + remainder;
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

module.exports = {
  parseFrontmatterAndBody,
  stripManagedComponents,
  findImportBlockEndIndex,
  injectComponentsAfterImports,
  processFile,
  main,
  HEAD_BLOCK,
  SUBTITLE_LINE,
};

if (require.main === module) {
  main();
}
