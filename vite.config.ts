import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    // This is the critical fix. 
    // We define a mock version string that 'readable-stream' and others expect.
    'process.version': JSON.stringify('v18.0.0'),
    'process.env': {},
  },
});