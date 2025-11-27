import fs from 'fs';
import path from 'path';

export default function(context: any, options: any) {
  return {
    name: 'generate-admin-index',
    async postBuild() {
      const env = process.env.DOCUSAURUS_ENV;
      const adminDir = path.join(__dirname, '..', 'static', 'admin');
      const target = path.join(adminDir, 'index.html');
      const src = env === 'stg'
        ? path.join(adminDir, 'index.cms.html')
        : path.join(adminDir, 'index.404.html');
      fs.copyFileSync(src, target);
    }
  };
}