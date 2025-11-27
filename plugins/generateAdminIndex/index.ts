import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

export default function generateAdminIndex(context: LoadContext): Plugin<void> {
  const {siteDir} = context;

  return {
    name: 'generate-admin-index',
    // Create the target file alongside the config.yml generator: siteDir/static/admin
    // We do this before the build output is generated so Docusaurus can pick it up from static/.
    async loadContent() {
      const env = process.env.DOCUSAURUS_ENV || process.env.VERCEL_ENV || 'production';

      const adminStaticDir = path.join(siteDir, 'static', 'admin');
      const target = path.join(adminStaticDir, 'index.html');

      // Templates colocated with this plugin for reliability
      const templatesDir = path.join(__dirname);
      const cmsTpl = path.join(templatesDir, 'index.cms.html');
      const notFoundTpl = path.join(templatesDir, 'index.404.html');

      // Ensure destination dir exists
      fs.mkdirSync(adminStaticDir, {recursive: true});

      // Choose template based on environment (stg -> CMS, otherwise 404)
      const chosen = env === 'stg' ? cmsTpl : notFoundTpl;

      if (!fs.existsSync(chosen)) {
        // Fallback minimal 404 if template missing
        const fallback = '<!doctype html><meta charset="utf-8"><title>404</title><h1>404 Not Found</h1>';
        fs.writeFileSync(target, fallback, 'utf8');
        // eslint-disable-next-line no-console
        console.log(`[generate-admin-index] Template not found, wrote fallback to ${path.relative(siteDir, target)} (env=${env})`);
        return null;
      }

      fs.copyFileSync(chosen, target);
      // eslint-disable-next-line no-console
      console.log(`[generate-admin-index] Wrote ${path.relative(siteDir, target)} from ${path.relative(siteDir, chosen)} (env=${env})`);

      return null;
    },
  };
}