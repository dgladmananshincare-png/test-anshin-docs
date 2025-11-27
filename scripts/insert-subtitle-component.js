#!/usr/bin/env node
/**
 * Insert Subtitle component import and JSX under frontmatter if a subtitle is present.
 * Idempotent: skips if already inserted.
 * Usage: node scripts/insert-subtitle-component.js "file1.md\nfile2.md"
 */

const fs = require('fs');
const path = require('path');

function hasSubtitleComponent(body) {
  return /<Subtitle\s+text=\{frontMatter\.subtitle\}\s*\/?>/.test(body);
}

function hasImport(lines) {
  return lines.some(l => /import\s+Subtitle\s+from\s+'@site\/src\/components\/Subtitle';/.test(l));
}

function processFile(filePath) {
  const abs = path.resolve(filePath);
  const repoRoot = path.resolve(__dirname, '..');
  if (!abs.startsWith(repoRoot)) {
    console.log(`[skip] outside repo: ${filePath}`);
    return;
  }
  if (!fs.existsSync(abs)) {
    console.log(`[skip] not found: ${filePath}`);
    return;
  }
  let raw = fs.readFileSync(abs, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) {
    console.log(`[skip] no frontmatter: ${filePath}`);
    return;
  }
  const fmBlock = fmMatch[0];
  const fmContent = fmMatch[1];
  const body = raw.slice(fmBlock.length);

  // Extract subtitle value (simple YAML key parse)
  const subtitleLine = fmContent.split(/\n/).find(l => /^subtitle:\s*/.test(l));
  if (!subtitleLine) {
    console.log(`[skip] no subtitle: ${filePath}`);
    return;
  }
  // Don't insert if component already exists
  if (hasSubtitleComponent(body)) {
    console.log(`[skip] component exists: ${filePath}`);
    return;
  }

  // Prepare insertion
  const lines = body.split(/\n/);
  const importLine = "import Subtitle from '@site/src/components/Subtitle';";
  const componentLine = "<Subtitle text={frontMatter.subtitle} />";

  let insertionIndex = 0; // top of body
  // If body starts with existing imports, insert after the last contiguous import block
  while (insertionIndex < lines.length && /^import\s+.+from\s+['"].+['"];?$/.test(lines[insertionIndex].trim())) {
    insertionIndex++;
  }

  // Ensure import present (if not already somewhere else)
  if (!hasImport(lines.slice(0, insertionIndex))) {
    lines.splice(insertionIndex, 0, importLine);
    insertionIndex++; // move down after import
  }
  // Add blank line before component if needed
  if (lines[insertionIndex] && lines[insertionIndex].trim() !== '') {
    lines.splice(insertionIndex, 0, '');
    insertionIndex++;
  }
  lines.splice(insertionIndex, 0, componentLine, '');

  const newBody = lines.join('\n');
  const out = fmBlock + newBody;
  fs.writeFileSync(abs, out, 'utf8');
  console.log(`[inserted] ${filePath}`);
}

function main() {
  const input = process.argv[2] || '';
  const files = input.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (files.length === 0) {
    console.log('No files provided');
    return;
  }
  for (const f of files) {
    processFile(f);
  }
}

main();
