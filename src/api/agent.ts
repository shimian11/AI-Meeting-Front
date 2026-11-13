/**
 * 出题官接口（走 Java 网关）
 *
 * 链路：前端 → Java(/api/banma/v1/interview/agent/question-officer) → Python(/v1/agents/question-officer/run)
 *
 * 为什么不再直连 Python：
 *   ① 内部令牌只能在服务端注入——生产环境没有 Vite proxy，直连就得把令牌打进前端或配 Nginx
 *   ② 限流/熔断/trace 都在 Java，直连等于绕过它们
 *   ③ Python 不必对公网暴露
 */

import { apiLong } from './client'

/** 出题请求（字段名与 Python 契约一致；trace_id 由 Java 生成，前端不再传） */
export interface OfficerRequest {
	session_id: string
	user_input: string
	resume_url?: string | null
	direction_default?: string | null
	history_digest?: string[]
}

/** 出题响应（对齐 QuestionOfficerResponse） */
export interface OfficerResponse {
	trace_id: string
	intent: 'GENERATE' | 'SMALL_TALK'
	questions: string[]
	resume_score: number | null
	resume_suggest: string[]
	resume_type: string | null
	questions_source: 'kb+resume' | 'resume_only' | 'none'
	small_talk: string | null
	steps_trace: Record<string, number>
}

/**
 * 打出题官全链路（意图 → 简历解析 → 检索 → 合成）
 * 实测 6~9 秒：Java 侧 ai-guard 出题阶段超时 60s，此处 axios 给 60s 与之对齐
 */
export function runQuestionOfficer(req: OfficerRequest) {
	return apiLong.post<OfficerResponse>('/interview/agent/question-officer', req)
}
