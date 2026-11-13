/**
 * 面试相关接口：会话创建 / 简历上传
 * 对齐 Java：
 *   InterviewSessionController（/api/banma/v1/interview/*）
 *   AgentFileController（/api/banma/v1/agents/files/*）
 */

import { api } from './client'

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
