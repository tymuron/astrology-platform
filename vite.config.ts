import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                // Split rarely-changing third-party code into its own long-lived
                // chunks. They cache across deploys (app code changes far more
                // often than these libs) and download in parallel with app code.
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'supabase-vendor': ['@supabase/supabase-js'],
                },
            },
        },
    },
})
