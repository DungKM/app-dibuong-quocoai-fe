import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 3000,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: env.VITE_API_BACKEND_URL,
          changeOrigin: true,
        },
        "/socket.io": {
          target: env.VITE_API_BACKEND_URL,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});