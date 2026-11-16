/**
 * axios 实例：统一信封解包 + token 注入 + 401 跳登录。
 * 为什么用两个实例：Java 返回 Result 信封（code/data/requestId），
 * Python 出题官返回裸 JSON（无信封）——解包逻辑不同，混在一起每个调用点都要判断。
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios"
import { ElMessage } from "element-plus"
import router from '@/router'

/** Java统一信封 */
export interface ApiResult<T = unknown> {
	code: string				// '0' = 成功
	message: string
	data: T
	requestId: string
}

/**
 * 解包后的实例类型。
 * 为什么需要它：响应拦截器已经把 Result 信封剥掉、直接返回 data，
 * 但 TS 仍按 axios 原签名认为返回 AxiosResponse —— 两者不符。
 * 这里用 Omit 去掉原方法签名，重声明成"一个泛型 = 业务数据类型"。
 */
interface UnwrappedInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete'> {
	get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
	post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
	put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
	delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}

const TOKEN_KEY = 'banma_token'

export const tokenStore = {
	get: () => localStorage.getItem(TOKEN_KEY) ?? '',
	set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
	clear: () => localStorage.removeItem(TOKEN_KEY),
}

/* ---------- Java 实例（/api 前缀，Result 信封） ---------- */

/**
 * 两个实例共用同一套拦截器：token 注入 + 信封解包 + 401 跳登录。
 *
 * <p>为什么先建裸 AxiosInstance、装配完再断言成 UnwrappedInstance：
 * 拦截器挂载必须在类型别修正之前完成（`UnwrappedInstance` 用 Omit 去掉了
 * 原始方法签名，无法再传给 `interceptors.use`）。</p>
 */
function createJavaApi(timeout: number): UnwrappedInstance {
	const instance = axios.create({ baseURL: '/api/banma/v1', timeout })

	instance.interceptors.request.use((cfg) => {
		const token = tokenStore.get()
		// Java 侧 Sa-Token 从请求头取 token；无 token 时不加，让后端返回未登录
		if (token) cfg.headers.Authorization = token
		return cfg
	})

	instance.interceptors.response.use(
		(resp) => {
			const body = resp.data as ApiResult
			if (body.code !== '0') {
				// 业务失败：HTTP 200 但 code != 0（Sa-Token 未登录等也走这里）
				ElMessage.error(body.message || '请求失败')
				if (body.code === '401' || /登录/i.test(body.message)) {
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

	return instance as unknown as UnwrappedInstance
}

/** 普通 CRUD：15s 内失败，避免用户干等 */
export const api = createJavaApi(15_000)

/**
 * 长耗时实例：给 AI 类接口用（出题实测 6~9s，冷启动可能到 15s+）。
 *
 * <p>为什么不直接把 api 的超时调大：普通 CRUD 应该 15s 内失败——
 * 拖到 60s 只会让用户多等 45 秒才看到"网络错误"。超时按接口性质分档，而不是一刀切。</p>
 *
 * <p>60s 与 Java 侧 {@code ai-guard.stages.interview-extraction.timeout-millis} 对齐：
 * 两边不一致时，先触发的一方决定错误类型（浏览器超时 vs 业务超时），徒增排查成本。</p>
 */
export const apiLong = createJavaApi(60_000)

/* ---------- 已移除 agentApi（2026-11-13） ----------
 * 原因：前端不再直连 Python。出题走 Java 网关（/api/banma/v1/interview/agent/question-officer），
 * 由 Java 注入内部令牌并转发 Python。这样生产环境无需在 Nginx/Vite 里配令牌注入，
 * 也顺带恢复了 Java 侧的限流/熔断/trace。
 */