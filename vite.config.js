const portalVersion = String(Date.now());
const portalVersionPlugin = {name:'portal-version',generateBundle(){this.emitFile({type:'asset',fileName:'portal-version.json',source:JSON.stringify({version:portalVersion})});}};
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: { __GMS_BUILD_VERSION__: JSON.stringify(portalVersion),
    'import.meta.env.VERCEL_ENV': JSON.stringify(
      process.env.VERCEL_ENV || (mode === 'development' ? 'development' : '')
    ),
  },
  plugins: [react(), portalVersionPlugin]
}));
