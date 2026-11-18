/** 当前题：GET /interview/sessions/{id}/current-question */
export interface CurrentQuestionResp{
  questionNumber: string
  questionContent: string
  isSuccess: boolean
}

/** 提交答案：POST /interview/sessions/{id}/interview/answer */
export interface AnswerReq {
  questionNumber: string
  answerContent: string
  requestId?: string
}

/** 答题响应：字段与后端 InterviewAnswerRespDTO 一一对应 */
export interface AnswerResp {
	questionNumber: string
  questionContent: string
  score: number | null
  totalScore: number | null
  isSuccess: boolean
  errorMessage: string | null
  feedback: string | null
  nextQuestion: string | null
  nextQuestionNumber: string | null
  isFollowUp: boolean | null
  followUpCount: number | null
  finished: boolean | null
  missingPoints: string[] | null
  followUpNeeded: boolean | null
  followUpQuestion: string | null
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
