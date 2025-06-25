import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
  },
  // SPA fallback: redirect all unknown routes to index.html
  // This is needed for BrowserRouter to work properly
  preview: {
    port: 4173,
    open: true,
  },
}));
