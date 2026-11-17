import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-xlsx': ['xlsx'],
          'vendor-icons': ['lucide-react'],
          'vendor-qr': ['html5-qrcode', 'qrcode.react']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Permissions-Policy': 'geolocation=(self "*"), camera=(self "*"), microphone=(self "*"), display-capture=(self "*")',
      'Feature-Policy': "geolocation 'self' *; camera 'self' *; microphone 'self' *; display-capture 'self' *"
    },
    watch: {
      ignored: [
        '**/test_downloads/**', 
        '**/test_screenshots/**', 
        '**/*.xlsx', 
        '**/*.crdownload',
        '**/server/**',
        '**/*.cjs',
        '**/*.db',
        '**/*.db-journal',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/*.sqlite'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
