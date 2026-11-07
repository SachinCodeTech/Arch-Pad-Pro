import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function swAssetInjector(): Plugin {
  return {
    name: 'sw-asset-injector',
    closeBundle() {
      try {
        const distSwPath = path.resolve(__dirname, 'dist/sw.js');
        const distAssetsDir = path.resolve(__dirname, 'dist/assets');
        if (fs.existsSync(distSwPath) && fs.existsSync(distAssetsDir)) {
          const files = fs.readdirSync(distAssetsDir, { recursive: true })
            .filter((f) => typeof f === 'string' && (f.endsWith('.js') || f.endsWith('.css')));
          const assetUrls = files.map((f) => `/assets/${f}`);
          let swContent = fs.readFileSync(distSwPath, 'utf8');
          const injection = `\n// Built assets injected by Vite\nconst BUILT_ASSETS = ${JSON.stringify(assetUrls)};\nif (typeof PRECACHE_ASSETS !== 'undefined') { PRECACHE_ASSETS.push(...BUILT_ASSETS); }\n`;
          // Append to end of file so all variables are already declared
          swContent = swContent + injection;
          fs.writeFileSync(distSwPath, swContent, 'utf8');
        }
      } catch (e) {
        console.error('Failed to inject assets into dist/sw.js', e);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    plugins: [react(), tailwindcss(), swAssetInjector()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
