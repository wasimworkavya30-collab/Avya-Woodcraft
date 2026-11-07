import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, calls to /api are forwarded to the backend on port 4000,
// so VITE_API_URL can stay empty locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
