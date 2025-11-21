/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const env = process.env.DOCUSAURUS_ENV;

let vercelConfig;
if (env === 'stg') {
  // Staging: allow /admin and add auth/callback rewrites
  vercelConfig = {
    rewrites: [
      { source: '/auth', destination: '/api/auth.ts' },
      { source: '/callback', destination: '/api/callback.ts' },
    ],
    github: { silent: true },
  };
} else {
  // Production (any non-stg): block /admin only
  vercelConfig = {
    rewrites: [{ source: '/admin#', destination: '/404' }],
    github: { silent: true },
  };
}

const out = path.join(__dirname, '..', 'vercel.json');
fs.writeFileSync(out, JSON.stringify(vercelConfig, null, 2));
console.log(`[generate-vercel-json] Wrote ${out} for env=${env || 'unset'}`);
