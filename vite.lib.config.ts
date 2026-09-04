import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts'; // Suggesting usage of dts plugin for types

// https://vitejs.dev/config/
export default defineConfig({
    publicDir: false,
    // Keep emitted assets relative to the library bundle. Consumers may serve
    // the package from a sub-path or a CDN rather than the site root.
    base: './',
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
            tsconfigPath: './tsconfig.app.json',
            include: [
                'src/index.ts',
                'src/components/**/*.tsx',
                'src/hooks/**/*.ts',
            ],
        }),
    ],
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'MultiQRScanner',
            // the proper extensions will be added
            fileName: 'multi-qr-scanner',
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['react', 'react-dom'],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
    },
});
