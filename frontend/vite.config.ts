import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'
const pollingInterval = parseInt(process.env.CHOKIDAR_INTERVAL ?? '1000', 10)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling,
      interval: Number.isFinite(pollingInterval) ? pollingInterval : 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'],
    },
    hmr: {
      overlay: true,      // Derleme hatalarını tarayıcıda göster
    },
  },
  // Test configuration removed for MVP (no component tests)
  // test: {
  //   globals: true,
  //   environment: 'jsdom',
  //   setupFiles: './src/setupTests.ts',
  //   css: true,
  //   coverage: {
  //     provider: 'v8',
  //     reporter: ['text', 'json', 'html'],
  //     exclude: [
  //       'node_modules/',
  //       'src/setupTests.ts',
  //       '**/*.d.ts',
  //       '**/*.config.*',
  //       '**/mockData',
  //       'dist/',
  //     ],
  //   },
  // },
})
