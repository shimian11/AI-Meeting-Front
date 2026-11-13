import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), vueDevTools(), tailwindcss()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	server: {
		port: 5173,
		proxy: {
			// Java 后端（唯一入口）
			'/api': { target: 'http://localhost:8002', changeOrigin: true },
			// 2026-11-13：已删除 '/agent' 代理。
			// 出题改为 前端 → Java → Python（Java 注入内部令牌并转发），
			// 前端不再直连 8100，也不再需要在 Vite 里配 BANMA_AGENT_TOKEN。
			// 生产环境同理：只需把 /api 反代到 Java，Python 不必对公网暴露。
		},
	},
})
