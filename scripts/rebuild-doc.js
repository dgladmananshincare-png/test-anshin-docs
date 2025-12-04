#!/usr/bin/env node

// Rebuilds a doc's auto region: clears, injects imports, injects components
// Usage: node scripts/rebuild-doc.js <filepath>

const path = require('path');
const fs = require('fs');
const { processFile: clearAutoRegion } = require('./clear-auto-region');
const { processFile: addImports } = require('./add-imports');
const { processFile: addComponents } = require('./add-components');

const [,, inputPath] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/rebuild-doc.js <filepath>');
  process.exit(1);
}

// Harden path handling: enforce .md, resolve, and ensure under docs/ directory
const workspaceRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(workspaceRoot, 'docs');
const safeRel = inputPath.endsWith('.md') ? inputPath : `${inputPath}.md`;
const absTarget = path.resolve(workspaceRoot, safeRel);

if (!absTarget.startsWith(docsRoot + path.sep)) {
  console.error('[rebuild-doc] Refusing to write outside docs/ directory. Provide a path under docs/.');
  process.exit(1);
}

if (!fs.existsSync(absTarget)) {
  console.error(`[rebuild-doc] File does not exist: ${absTarget}`);
  process.exit(1);
}

// Step 0: Assign sidebar position (if needed)
const { execSync } = require('child_process');
execSync(`node scripts/assign-sidebar-position.js ${path.relative(workspaceRoot, absTarget)}`, { stdio: 'inherit' });
// Step 1: Clear auto region
clearAutoRegion(absTarget);
// Step 2: Inject imports
addImports(absTarget);
// Step 3: Inject components
addComponents(absTarget);

console.log(`[rebuild-doc] Assigned sidebar position and rebuilt auto region for ${path.relative(workspaceRoot, absTarget)}`);
