import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                iframeHandler: resolve(__dirname, 'src/content-scripts/iframe-handler.ts')
            },
            output: {
                entryFileNames: "[name].js" // This outputs "iframeHandler.js"
            }
        }
    }
});
