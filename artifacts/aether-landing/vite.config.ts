import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Detect environment
const isReplit = !!process.env.REPL_ID;
const isProduction = process.env.NODE_ENV === "production";

// Use environment variables or defaults for local dev
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Replit-specific plugins only if on Replit
    ...(isReplit ? [
      // These would usually be imported dynamically to avoid errors locally
      // but we'll leave them out for the universal config unless needed
    ] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: !isReplit, // Allow flexible ports locally
    host: "0.0.0.0",
    // PROXY: This allows your React app to talk to your backend secretly
    proxy: !isProduction ? {
      '/api/proxy': {
        target: 'http://localhost:8080', // Change this to your Replit URL if testing remotely
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
      }
    } : undefined
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});

