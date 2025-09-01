import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// ...existing code...

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0", // Permite acesso de qualquer IP
    port: 5001, // Porta do Vite (diferente do servidor)
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
