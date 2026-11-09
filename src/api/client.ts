/**
 * axios 实例：统一信封解包 + token 注入 + 401 跳登录。
 * 为什么用两个实例：Java 返回 Result 信封（code/data/requestId），
 * Python 出题官返回裸 JSON（无信封）——解包逻辑不同，混在一起每个调用点都要判断。
 */

import axios from "axios"
import { ElMessage } from "element-plus"
import router from '@/router'

/** Java统一信封 */
export interface ApiResult<T = unknown> {
	code: string				// '0' = 成功
	message: string
	data: T
	requestId: string
}

const TOKEN_KEY = 'banma_token'

export const tokenStore = {
	get: () => localStorage.getItem(TOKEN_KEY) ?? '',
	set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
	clear: () => localStorage.removeItem(TOKEN_KEY),
}

/* ---------- Java 实例（/api 前缀，Result 信封） ---------- */
export const api = axios.create({baseURL: '/api/banma/v1', timeout: 15_000})

/*在请求体加上token认证*/
api.interceptors.request.use((cfg) => {
	const token = tokenStore.get()
	if (token) cfg.headers.Authorization = token
	return cfg
})

api.interceptors.response.use(
	(resp) => {
		const body = resp.data as ApiResult
		if (body.code !== '0'){
			// 业务失败：HTTP 200 但 code != 0（Sa-Token 未登录等也走这里）
			ElMessage.error(body.message || '请求失败')
			if (body.code === '401' || /登录/i.test(body.message)){
				tokenStore.clear()
				void router.push('/login')
			}
			return Promise.reject(new Error(body.message))
		}
		return body.data as never		// 直接返回 data，调用方不用再 .data.data
	},
	(err) => {
		ElMessage.error(err.message || '网络错误')
		return Promise.reject(err)
	},
)

/* ---------- Python 实例（/agent 前缀，裸 JSON） ---------- */
export const agentApi = axios.create({ baseURL: '/agent', timeout: 60_000 })
// 出题全链路（简历解析 + 合成）实测 6~9s，15s 会误杀；给 60s