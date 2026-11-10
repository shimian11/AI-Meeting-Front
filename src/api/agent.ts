/**
 * Python 出题官接口
 * 注意：走 agentApi（/agent 前缀），鉴权由 Vite proxy 注入，前端不持有令牌
 */

import { agentApi } from './client'

/** 出题请求（对齐 QuestionOfficerRequest） */
export interface OfficerRequest {
	trace_id: string
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
 * 实测 6~9 秒，所以 axios 超时给到 60s
 */
export function runQuestionOfficer(req: OfficerRequest) {
  return agentApi.post<OfficerResponse>('/v1/agents/question-officer/run', req)
}