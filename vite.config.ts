import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND_URL = env.VITE_API_BACKEND_URL || 'http://localhost:5000'; // Cổng Backend bạn đang chạy

  return {
    define: {
      'process.env': env,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Không cần allowedHosts và hmr wss khi chạy localhost
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
        },
        '/socket.io': {
          target: BACKEND_URL,
          ws: true, // Quan trọng: Cho phép Websocket thông qua proxy của Vite
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  };
});