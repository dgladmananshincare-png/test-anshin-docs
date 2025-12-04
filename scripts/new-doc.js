#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  parseFrontmatterAndBody,
  ensureFrontmatter,
  dumpFrontmatterOrdered,
  TOP_MARKER,
  BOTTOM_MARKER,
} = require('./ensure-frontmatter');

const [,, inputPath, title, subtitle] = process.argv;

if (!inputPath || !title) {
  console.error('Usage: node scripts/new-doc.js <filepath> <title> [subtitle]');
  process.exit(1);
}

// Harden path handling: enforce .md, resolve, and ensure under docs/ directory
const workspaceRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(workspaceRoot, 'docs');
const safeRel = inputPath.endsWith('.md') ? inputPath : `${inputPath}.md`;
const absTarget = path.resolve(workspaceRoot, safeRel);

if (!absTarget.startsWith(docsRoot + path.sep)) {
  console.error('[new-doc] Refusing to write outside docs/ directory. Provide a path under docs/.');
  process.exit(1);
}

// Prepare minimal frontmatter
const id = path.basename(absTarget, '.md');
const minimal = `---\n` +
  `id: ${id}\n` +
  `title: ${title}\n` +
  `subtitle: ${subtitle ? subtitle : 'null'}\n` +
  `---\n\n`;

// Ensure directory exists and write minimal file first
fs.mkdirSync(path.dirname(absTarget), { recursive: true });
fs.writeFileSync(absTarget, minimal, 'utf8');

// Read back and build full outline using ensure-frontmatter helpers
const raw = fs.readFileSync(absTarget, 'utf8');
const parsed = parseFrontmatterAndBody(raw);
const fmEnsured = ensureFrontmatter(parsed.fm);
const fmDump = dumpFrontmatterOrdered(fmEnsured);

let body = parsed.body.trimStart();
const hasTop = /^\s*<!--@/.test(body);
const hasBottom = /^(.*)<!--#/s.test(body);
if (!hasTop && !hasBottom) {
  body = `${TOP_MARKER}\n${BOTTOM_MARKER}\n${body.trimStart()}`;
} else if (hasTop && !hasBottom) {
  console.error('[new-doc] Marker mismatch: top present without bottom.');
  process.exit(1);
} else if (!hasTop && hasBottom) {
  console.error('[new-doc] Marker mismatch: bottom present without top.');
  process.exit(1);
}

const output = fmDump + '\n' + body + (body.endsWith('\n') ? '' : '\n');
fs.writeFileSync(absTarget, output, 'utf8');

console.log(`[new-doc] Initialized and outlined ${path.relative(workspaceRoot, absTarget)}`);
