import fs from 'fs';
import path from 'path';

interface VercelConfig {
  rewrites?: { source: string; destination: string }[];
  redirects?: { source: string; destination: string; permanent?: boolean }[];
  github?: { silent?: boolean };
}

function buildVercelConfig(env: string | undefined): VercelConfig {
  if (env === 'stg') {
    // Staging: allow /admin and enable auth/callback rewrites
    return {
      rewrites: [
        { source: '/auth', destination: '/api/auth.ts' },
        { source: '/callback', destination: '/api/callback.ts' },
      ],
      github: { silent: true },
    };
  }

  // Production (or any non-stg env): block /admin only; no auth/callback rewrites
  return {
    rewrites: [
      { source: '/admin', destination: '/404' },
    ],
    github: { silent: true },
  };
}

export default function generateVercelConfigPlugin() {
  return {
    name: 'generate-vercel-config',
    async postBuild(props: { siteDir: string }) {
      const env = process.env.DOCUSAURUS_ENV;
      const configObject = buildVercelConfig(env);
      const filePath = path.join(props.siteDir, 'vercel.json');
      fs.writeFileSync(filePath, JSON.stringify(configObject, null, 2));
      // eslint-disable-next-line no-console
      console.log(`[generate-vercel-config] vercel.json written for env=${env || 'undefined'}`);
    },
  };
}
