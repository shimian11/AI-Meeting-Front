<script setup lang="ts">
/**
 * 面试间
 * 页面职责：
 *   1. 进入即调用 Python 出题官（一次调用返回全部结果）
 *   2. 等待期展示"准备卡"（说明正在做什么，避免白屏）
 *   3. 完成后展示：简历评估卡 + 题目列表 + 耗时明细
 *
 * 状态机：loading → ready / error
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { runQuestionOfficer, type OfficerResponse } from '@/api/agent'
import { getCurrentQuestion, restoreSession, submitAnswer } from '@/api/interview'
import type { AnswerResp, CurrentQuestionResp } from '@/api/types'
import PageHeader from '@/components/ui/PageHeader.vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'


const route = useRoute()
const router = useRouter()

/* ---------- 路由参数 ---------- */
const sessionId = String(route.params.sessionId ?? '')
const resumeUrl = (route.query.resumeUrl as string | undefined) ?? null

/* ---------- 状态 ---------- */
const phase = ref<'loading'| 'ready' | 'error'>('loading')
const result = ref<OfficerResponse | null>(null)
const errorMsg = ref('')

/* ---------- 方法 ---------- */

/**
 * 拉取出题结果
 *
 * 步骤：
 *   1. 生成 trace_id（后端要求必填，用于全链路追踪）
 *   2. 调出题官接口：user_input 先固定为出题意图，Java 接线后由真实话术替换
 *   3. 成功置 ready 并保存结果；失败置 error 并保留错误信息供重试
 */
async function loadQuestions() {
	phase.value = 'loading'
	errorMsg.value = ''
	try {
		const res = await runQuestionOfficer({
			// Java 日志 → Python 日志 → steps_trace，前端伪造的 uuid 无法对账
			session_id: sessionId || crypto.randomUUID(),
			user_input: '根据我的简历帮我出几道面试题',
			resume_url: resumeUrl,
			direction_default: null,	// 交给后端三级归一：简历 → 关键词 → LLM
			history_digest: [],
		})
		result.value = res
		phase.value = 'ready'
		void loadCurrent()
	} catch (e) {
		// axios 拦截器已弹过网络错误提示，这里只负责页面态与重试入口
		errorMsg.value = e instanceof Error ? e.message : '出题失败'
		phase.value = 'error'
	}
}

/** 重试：清空结果重新拉取 */
function onRetry() {
	void loadQuestions()
}

/** 返回介绍页，重新上传简历 */
function onBack() {
  void router.push('/interview')
}

/** 来源标签文案：把后端的三个枚举值翻成人话 */
function sourceLabel(src: OfficerResponse['questions_source']) {
	return { 'kb+resume': '题库 + 简历定制', resume_only: '仅简历定制', none: '通用题库为空，由模型生成' }[src]
}

const activeIndex = ref(0)
const current = ref<CurrentQuestionResp | null>(null)
const answer = ref('')
const scored = ref<AnswerResp | null>(null)
const submitting = ref(false)
const isFollowUp = ref(false)

/** 拉当前题：接口没返回值时退回出题官给的题目列表，避免白屏 */
async function loadCurrent() {
	try {
		current.value = await getCurrentQuestion(sessionId)
	} catch {
		current.value = null
	}
	answer.value = ''
	scored.value = null
}

/** 当前展示的题干：优先后端当前题，其次本地题目列表 */
const activeQuestion = computed(() => {
	if (current.value?.questionContent) return current.value.questionContent
	return result.value?.questions?.[activeIndex.value] ?? ''
})

/** 当前题号：优先后端游标（可能是 "3-1" 这种追编号），其次本地下标 +1 */
const activeQuestionNumber = computed(() =>
  String(current.value?.questionNumber ?? activeIndex.value + 1)
)

async function onSubmit() {
	if (!answer.value.trim() || submitting.value) return
	submitting.value = true
	try {
    // 必须赋值：下面要读 finished / nextQuestion，丢了返回值会直接崩
    scored.value = await submitAnswer(sessionId, {
      questionNumber: activeQuestionNumber.value,
      answerContent: answer.value,
    })

    // 已到最后一题：跳报告页
    if (scored.value.finished) {
      void router.push(`/interview/report/${sessionId}`)
      return
    }

    // 用响应里的下一题直接推进，省一次 next-question 请求
    if (scored.value.nextQuestionNumber && scored.value.nextQuestion) {
      current.value = {
        questionNumber: scored.value.nextQuestionNumber,
        questionContent: scored.value.nextQuestion,
        isSuccess: true,
      }
      isFollowUp.value = Boolean(scored.value.isFollowUp)
      answer.value = ''
    }
	} finally {
		submitting.value = false
	}
}


/**
 * 进页面：先出题（渲染题目列表），再尝试从快照恢复游标。
 *
 * <p>必须串行：两个 onMounted 并行时，restore 的网络请求可能晚于出题返回，
 * 会把已经渲染好的题号覆盖成快照值，表现为「刚进来是第 1 题，一秒后跳到第 5 题」。</p>
 */
onMounted(async () => {
	await loadQuestions()
	try {
		const restored = await restoreSession(sessionId)
		if (restored?.questionNumber) {
			activeIndex.value = Number(restored.questionNumber) - 1
			current.value = restored
		}
	} catch {
		/* 无快照属正常，忽略 */
	}
})
</script>

<template>
	<div>
		<PageHeader kicker="INTERVIEW / 面试间" title="模拟面试" :desc="`会话 ${sessionId || '（本地调试）'}`">
			<template #actions>
				<button class="btn-ghost text-[13px]" @click="onBack">重新上传简历</button>
			</template>
		</PageHeader>

		<!-- 加载态：三段式进度 + 骨架 -->
		<section v-if="phase === 'loading'" class="panel px-8 py-10">
			<h2 class="text-[17px]">AI 正在为你准备面试</h2>
			<ol class="mt-6 list-none space-y-4 p-0">
				<li v-for="(step, i) in ['简历已上传', '解析简历并检索题库', '生成面试题']" :key="step" class="flex items-center gap-3">
					<span class="font-mono text-[11px]" :class="i === 0 ? 'text-success' : i === 1 ? 'text-ink' : 'text-muted'">
						{{ i === 0 ? '✓' : String(i + 1).padStart(2, '0') }}
					</span>
					<span class="text-[14px]" :class="i === 2 ? 'text-muted' : 'text-ink-2'">{{ step }}</span>
				</li>
			</ol>
			<div class="rule my-6" />
			<p class="mono-label">全链路约 6~9 秒 · 意图 → 简历解析 → 题库检索 → 合成</p>
			<div class="mt-6 space-y-3">
				<div v-for="n in 4" :key="n" class="h-3 animate-pulse rounded-[2px] bg-surface-2" :style="{ width: `${92 - n * 12}%` }" />
			</div>
		</section>

		<!-- 错误态 -->
		<section v-else-if="phase === 'error'" class="panel border-danger px-8 py-10">
			<h2 class="text-[17px] text-danger">出题失败</h2>
			<p class="mt-2 text-[13px] leading-[1.8] text-ink-2">{{ errorMsg }}</p>
			<div class="mt-6 flex gap-3">
				<button class="btn-primary text-[14px]" @click="onRetry">重试</button>
				<button class="btn-ghost text-[14px]" @click="onBack">返回上传页</button>
			</div>
			<div class="rule my-6" />
			<p class="mono-label">常见原因 · Python 未启动(8100) · 内部令牌不匹配 · 简历 URL 过期</p>
		</section>

		<!-- 就绪态 -->
		<template v-else-if="result">
			<!-- 闲聊分支 -->
			<section v-if="result.intent === 'SMALL_TALK'" class="panel px-8 py-10">
				<p class="text-[15px] leading-[1.9] text-ink-2">{{ result.small_talk || '（闲聊回复）' }}</p>
			</section>

			<template v-else>
				<!-- 简历评估条 -->
				<section v-if="result.resume_score !== null" class="panel mb-8 flex items-center gap-6 px-6 py-5">
					<div>
						<div class="mono-label">简历评分</div>
						<div class="mt-1 flex items-end gap-2">
							<span class="font-mono text-[32px] leading-none tabular-nums">{{ result.resume_score }}</span>
							<span class="mb-1 text-[11px] text-muted">/ 100</span>
						</div>
					</div>
					<div class="rule h-12 w-px shrink-0 self-center" style="width: 1px" />
					<ul class="m-0 min-w-0 flex-1 list-none space-y-1 p-0">
						<li v-for="(s, i) in result.resume_suggest" :key="i" class="text-[12px] leading-[1.7] text-muted">· {{ s }}</li>
					</ul>
					<span v-if="result.resume_type" class="mono-label shrink-0">{{ result.resume_type }}</span>
				</section>

				<div class="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
					<!-- 左：题号列表 -->
					<aside>
						<div class="mono-label mb-3">题目 · {{ result.questions.length }}</div>
						<ol class="m-0 list-none space-y-1 p-0">
							<li v-for="(q, i) in result.questions" :key="i">
								<!-- 纯展示：面试按顺序答，不支持跳题（跳题会与后端游标错位，提交被判 stale_question） -->
								<div class="flex w-full items-center gap-3 rounded-[2px] px-3 py-2" :class="i === activeIndex ? 'bg-accent-soft' : ''">
									<span class="font-mono text-[11px]" :class="i === activeIndex ? 'text-ink' : 'text-muted'">{{ String(i + 1).padStart(2, '0') }}</span>
									<span class="truncate text-[13px]" :class="i === activeIndex ? 'text-ink' : 'text-muted'">{{ q }}</span>
								</div>
							</li>
						</ol>
						<div class="rule my-5" />
						<div class="mono-label">来源</div>
						<div class="mt-1 text-[12px] leading-[1.7] text-muted">{{ sourceLabel(result.questions_source) }}</div>
					</aside>

					<!-- 右：当前题 + 作答 + 评分 -->
					<section>
						<article class="panel px-7 py-6">
							<div class="flex items-center gap-2">
								<span class="mono-label">第 {{ activeQuestionNumber }} 题</span>
								<!-- 追问标记：后端 isFollowUp=true 时显示，追问也是一道独立题 -->
								<span v-if="isFollowUp" class="rounded-[2px] border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] text-muted">追问</span>
							</div>
							<h2 class="mt-2 text-[19px] leading-[1.7]">{{ activeQuestion }}</h2>
						</article>

						<div class="mt-6">
							<label class="mono-label" for="answer">你的回答</label>
							<textarea
								id="answer"
								v-model="answer"
								rows="7"
								placeholder="先说结论，再说依据，最后补边界与例子。"
								class="mt-2 w-full resize-y rounded-[3px] border border-rule bg-paper-hi px-4 py-3 text-[15px] leading-[1.9] text-ink outline-none focus:border-rule-strong"
							/>
							<div class="mt-3 flex items-center gap-4">
								<button class="btn-primary text-[14px]" :disabled="!answer.trim() || submitting" @click="onSubmit">{{ submitting ? '评分中…' : '提交本题' }}</button>
								<span class="mono-label">{{ answer.length }} 字</span>
							</div>
						</div>

						<!-- 评分回显卡：数据来自 POST .../interview/answer-json -->
						<article v-if="scored" class="panel mt-6 px-7 py-6">
							<div class="flex items-center gap-4">
								<ScoreBadge :score="scored.score ?? 0" size="lg" />
								<div>
									<div class="mono-label">本题得分</div>
									<div class="text-[13px] text-muted">满分 100 · 累计 {{ scored.totalScore ?? 0 }}</div>
								</div>
							</div>
							<div class="rule my-5" />
							<p class="text-[14px] leading-[1.9] text-ink-2">{{ scored.feedback ?? '（无点评）' }}</p>
							<ul v-if="scored.missingPoints?.length" class="m-0 mt-3 list-none space-y-1 p-0">
								<li v-for="m in scored.missingPoints" :key="m" class="text-[12px] leading-[1.7] text-danger">· {{ m }}</li>
							</ul>
							<div class="rule my-5" />
							<p class="mono-label">评分结果来自 POST .../interview/answer-json</p>
						</article>

						<footer class="mt-8">
							<div class="mono-label">耗时</div>
							<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
								<span v-for="(ms, k) in result.steps_trace" :key="k" class="font-mono text-[11px] text-muted">{{ k }} {{ ms }}ms</span>
							</div>
						</footer>
					</section>
				</div>
			</template>
		</template>
	</div>
</template>
