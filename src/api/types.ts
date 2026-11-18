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

/** 报告列表项：GET /interview/interview/records（后端 IPage<InterviewRecordRespDTO>） */
export interface ReportItem {
	sessionId: string
	interviewDirection: string | null
	interviewScore: number | null
	interviewStatus: string | null
	questionCount: number | null
	/** 毫秒时间戳（后端 Date 直接序列化） */
	createTime: number | null
}

/** 雷达五维（后端 RadarChartDTO） */
export interface RadarChart {
	resumeScore: number | null
	interviewPerformance: number | null
	/** 神态维：一期不做，恒为 0，展示时隐藏 */
	demeanorEvaluation: number | null
	potentialIndex: number | null
	professionalSkills: number | null
}

/** 雷达维度（后端 RadarDimensionItemRespDTO）：带 label，可直接画图 */
export interface RadarDimension {
	key: string
	label: string
	score: number | null
}

/** 逐题复盘（后端 InterviewPlaybackItemRespDTO）；注意后端没有 missingPoints */
export interface PlaybackItem {
	seq: number | null
	questionNumber: string | null
	questionContent: string | null
	answerContent: string | null
	score: number | null
	feedback: string | null
	isFollowUp: boolean | null
	followUpCount: number | null
}

/** 总评（后端 InterviewReviewFeedbackRespDTO） */
export interface ReviewFeedback {
	overallComment: string | null
	highlights: string[] | null
	improvementTips: string[] | null
	nextActions: string[] | null
}

/** 报告详情：GET /interview/interview/record/{sessionId} */
export interface ReportDetail {
	sessionId: string
	interviewDirection: string | null
	interviewScore: number | null
	resumeScore: number | null
	interviewStatus: string | null
	questionCount: number | null
	createTime: number | null
	interviewSuggestionsMap: Record<string, string> | null
	radarChart: RadarChart | null
	radarDimensions: RadarDimension[] | null
	playbackItems: PlaybackItem[] | null
	reviewFeedback: ReviewFeedback | null
}
