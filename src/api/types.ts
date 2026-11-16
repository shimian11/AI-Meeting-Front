/** 当前题：GET /interview/sessions/{id}/current-question */
export interface CurrentQuestionResp {
	questionNumber: number
	totalQuestions: number
	question: string
}

/** 提交答案：POST /interview/sessions/{id}/interview/answer */
export interface AnswerReq { answer: string }

export interface AnswerResp {
	questionNumber: number
	score: number
	feedback: string
	missingPoints: string[]
	followUpNeeded: boolean
	followUpQuestion?: string | null
	finished: boolean
}

/** 报告列表项：GET /interview/interview/records */
export interface ReportItem {
	sessionId: string
	direction: string
	createdAt: string
	totalScore: number
	questionCount: number
}

/** 报告详情：GET /interview/interview/record/{sessionId} */
export interface ReportDetail {
	sessionId: string
	direction: string
	createdAt: string
	totalScore: number
	radar: { label: string; score: number }[]
	items: {
		no: number
		question: string
		answer: string
		score: number
		feedback: string
		missing: string[]
	}[]
}