import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts'; // Suggesting usage of dts plugin for types

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        dts({ insertTypesEntry: true }), // Uncomment if vite-plugin-dts is installed
    ],
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/components/MultiQRScanner.tsx'),
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
