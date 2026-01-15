import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite Configuration
 * 
 * Configures Vite for React development with:
 * - React plugin for JSX support
 * - Path aliases for cleaner imports
 * - Server settings for Electron integration
 */
export default defineConfig({
  plugins: [react()],
  
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@store': path.resolve(__dirname, './src/store'),
      '@layout': path.resolve(__dirname, './src/layout'),
    },
  },
  
  // Dev server configuration
  server: {
    port: 5173,
    strictPort: true, // Fail if port is in use
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    // For Electron, we need to ensure assets work offline
    assetsDir: 'assets',
    
    // Generate source maps for debugging
    sourcemap: true,
  },
  
  // Base path - important for Electron file:// protocol in production
  base: './',
})
