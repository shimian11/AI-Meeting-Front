import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ model }) => {
	 /**
	   * 第三个参数传 '' 表示读取【所有】环境变量（不限 VITE_ 前缀）。
	   * 这样 BANMA_AGENT_TOKEN 只在 Node 进程里可见，不会进前端 bundle。
	   */
	const env = loadEnv(mode, process.cwd(), '')
	
	return {
		plugins: [vue(), vueDevTools(), tailwindcss()],
		resolve: {
			alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },	
		},
		server: {
			port: 5173,
			proxy: {
				// Java 后端
				'/api': { target: 'http://localhost:8002', changeOrigin: true },
				// Python 出题官：剥掉 /agent 前缀，并注入内部令牌		
				'/agent': {
					target: 'http://localhost:8100',
					changeOrigin: true,
					rewrite: (p) => p.replace(/^\/agent/, ''),
					headers: {
						// 生产环境由 Nginx 或 Java 网关做同样的事；dev 期用 proxy 顶上
						Authorization: `Bearer ${env.BANMA_AGENT_TOKEN ?? ''}`,
					},
				},
			},
		},
	}
})
