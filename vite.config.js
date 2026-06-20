import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    base: '/superposition-explainer/',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    build: {
        outDir: 'docs',
        assetsInlineLimit: 0,
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name][extname]',
                chunkFileNames: 'assets/[name].js',
                entryFileNames: 'assets/[name].js',
            },
        },
    },
})
