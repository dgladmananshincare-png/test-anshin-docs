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
const { TOP_MARKER_PREFIX, BOTTOM_MARKER_PREFIX, TOP_MARKER, BOTTOM_MARKER } = require('./sanitize-md');
function validateMarkersOrExit(body, fileLabel = '') {
  const topCount = (body.match(/^\s*<!--@.*$/gm) || []).length;
  const bottomCount = (body.match(/^\s*<!--#.*$/gm) || []).length;
  if (topCount > 1 || bottomCount > 1) {
    console.error(`[add-imports] Marker duplication detected ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
  if ((topCount === 1 && bottomCount === 0) || (topCount === 0 && bottomCount === 1)) {
    console.error(`[add-imports] Marker mismatch (one present without the other) ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
}

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
  // Broad regexes to catch any line resembling our managed imports, even if malformed (missing semicolons, extra spaces)
  const headLikeRe = /^\s*import\s*Head\s*from\s*['"]@docusaurus\/Head['"]\s*;?\s*$/i;
  const subtitleLikeRe = /^\s*import\s*Subtitle\s*from\s*['"]@site\/src\/components\/Subtitle['"]\s*;?\s*$/i;

  const filtered = lines.filter((l) => {
    const t = l.trim();
    if (t === IMPORT_SUBTITLE) return false; // exact match
    if (t === IMPORT_HEAD) return false; // exact match
    // remove any malformed or variant lines resembling the imports
    if (headLikeRe.test(t)) return false;
    if (subtitleLikeRe.test(t)) return false;
    return true;
  });
  return filtered.join('\n');
}

function ensureImportsAfterFrontmatter(fmBlock, body, importsToInject) {
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
  // Find exact positions of the first lines starting with our prefixes
  const markerLines = workingBody.split('\n');
  let startLine = -1, endLine = -1;
  for (let i = 0; i < markerLines.length; i++) {
    const line = markerLines[i];
    if (startLine === -1 && line.trim().startsWith(TOP_MARKER_PREFIX)) startLine = i;
    if (endLine === -1 && line.trim().startsWith(BOTTOM_MARKER_PREFIX)) endLine = i;
  }
  if (startLine === -1 || endLine === -1 || endLine < startLine) {
    console.error('[add-imports] Marker positions invalid.');
    process.exit(1);
  }
  // Compute offsets: startOfTopLine, startOfBottomLine, endOfBottomLine
  const startOfTopLine = markerLines.slice(0, startLine).join('\n').length;
  const startOfBottomLine = markerLines.slice(0, endLine).join('\n').length;
  const endOfBottomLine = markerLines.slice(0, endLine + 1).join('\n').length;
  // before = content up to the start of the top marker line
  const before = workingBody.slice(0, startOfTopLine);
  // remainder after bottom marker line
  const remainder = workingBody.slice(endOfBottomLine);

  // Start fresh content for auto-generated region
  let regionContent = '';

  // Normalize leading whitespace: we will manage spacing after frontmatter ourselves
  const bodyTrimmed = `${TOP_MARKER}\n${BOTTOM_MARKER}\n${remainder.trimStart()}`;

  const importBlock = importsToInject.join('\n');

  if (importBlock.length === 0) {
    // No imports to inject; ensure canonical markers remain with a single blank line between them
    const rebuiltRegion = `${TOP_MARKER}\n\n${BOTTOM_MARKER}\n`;
    return fmBlock + '\n' + before + rebuiltRegion + remainder;
  }

  // Decide separator after import block:
  // - If the next non-empty line is an import, keep imports contiguous (single newline)
  // - Otherwise ensure a blank line (two newlines) before non-import content
  const contentLines = bodyTrimmed.split('\n');
  const first = contentLines[0] || '';
  const isImport = /^\s*import\s+.+from\s+['"].+['"];?\s*$/.test(first);
  const afterImportSep = isImport ? '\n' : '\n\n';
  // Build fresh region: top marker, blank line, imports, spacing, bottom marker
  // Build canonical region explicitly using canonical markers and spacing
  const rebuiltRegion = `${TOP_MARKER}\n${importBlock}${afterImportSep}${BOTTOM_MARKER}\n`;
  return fmBlock + '\n' + before + rebuiltRegion + remainder;
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

module.exports = {
  parseFrontmatterAndBody,
  stripExistingManagedImports,
  ensureImportsAfterFrontmatter,
  processFile,
  main,
  IMPORT_SUBTITLE,
  IMPORT_HEAD,
};

if (require.main === module) {
  main();
}
