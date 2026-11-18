/**
 * 面试相关接口：会话创建 / 简历上传
 * 对齐 Java：
 *   InterviewSessionController（/api/banma/v1/interview/*）
 *   AgentFileController（/api/banma/v1/agents/files/*）
 */

import { api, apiLong } from './client'
import type { AnswerReq, AnswerResp, CurrentQuestionResp, ReportDetail, ReportItem } from './types'

/** 创建会话的响应（对齐 InterviewSessionCreateRespDTO） */
export interface SessionCreated {
	sessionId: string
	status: string
}

/** 上传响应（对齐 AgentFileUploadRespDTO） */
export interface FileUploaded {
	id: number
	sessionId: string | null
	bizType: string | null
	fileName: string
	fileSize: number
	contentType: string
	fileUrl: string
	createTime: string
}

/**
 * 创建面试会话
 * 后端按当前登录用户新建一条会话记录，返回 sessionId 供后续上传/出题使用
 */
export function createSession() {
	return api.post<SessionCreated>('/interview/sessions')
}

/**
 * 上传简历文件
 *
 * 步骤：
 *   1. 构造 FormData，键名 file 必须对齐后端 @RequestPart("file")
 *   2. bizType 标记业务用途（后端存库时区分简历/题库/音频）
 *   3. 不手动设置 Content-Type —— 浏览器会带上 multipart 边界，
 *      手动设成 'multipart/form-data' 反而会丢失 boundary 导致后端解析失败
 */
export function uploadResume(file: File) {
	const fd = new FormData()
	fd.append('file', file)
	fd.append('bizType', 'resume')
	// 2026-11-13 修正：原路径 '/agent/diles/upload' 有两处笔误（agent→agents、diles→files），
	// 且漏了 Java 侧的 sessionId 查询参数，实际会 404。
	return api.post<FileUploaded>('/agents/files/upload', fd)
}

/* ══════════════════════════════════════════════════════════
 * 答题与报告（2026-11-15 代写，R16 例外）
 * 说明：为让页面能立刻对着真接口跑，这 4 个封装由 Agent 代写。
 *      它们只是「路径 + 类型」的机械映射，无业务判断；你可以随时改写。
 *      真正留给你的是：会话状态机、提交流程、SSE 消费。
 * ══════════════════════════════════════════════════════════ */


/** 当前题：进入面试间或点「下一题」 */
export function getCurrentQuestion(sessionId: string) {
	return api.get<CurrentQuestionResp>(`/interview/sessions/${sessionId}/current-question`)
}

/** 提交本题答案：AI 评分 3~8 秒，必须用 60s 实例 */
export function submitAnswer(sessionId: string, req: AnswerReq) {
	return apiLong.post<AnswerResp>(`/interview/sessions/${sessionId}/interview/answer-json`, req)
}

/** 报告列表（分页） */
export function listReports(pageNum = 1, pageSize = 20) {
	return api.get<{ records: ReportItem[]; total: number }>('/interview/interview/records', {
		params: { pageNum, pageSize },
	})
}

/** 报告详情：总分 + 雷达 + 逐题复盘 */
export function getReportDetail(sessionId: string) {
	return api.get<ReportDetail>(`/interview/interview/record/${sessionId}`)
}

/** 推进到下一题：返回结构与当前题一致 */
export function advanceQuestion(sessionId: string) {
	return api.get<CurrentQuestionResp>(`/interview/sessions/${sessionId}/next-question`)
}

/** 断线恢复：无快照时后端可能返回 null 或抛错，调用方忽略即可 */
export function restoreSession(sessionId: string) {
	return api.get<CurrentQuestionResp | null>(`/interview/sessions/${sessionId}/restore`)
}
