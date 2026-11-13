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
import { onMounted,ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus'
import { runQuestionOfficer, type OfficerResponse } from '@/api/agent'


const route = useRoute()
const router = useRouter()

/* ---------- 路由参数 ---------- */
const sessionId = String(route.params.sessionId ?? '')
const resumeUrl = (route.query.resumeUrl as String | undefined) ?? null

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

// 进页面立刻出题
onMounted(() => {
  void loadQuestions()
})
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-10">
	    <!-- 顶部：会话信息 -->
	    <header class="mb-6 flex items-center justify-between border-b pb-4">
	      <div>
	        <h1 class="text-2xl font-bold">模拟面试</h1>
	        <p class="mt-1 text-xs text-gray-400">会话 {{ sessionId || '（本地调试）' }}</p>
	      </div>
	      <el-button text @click="onBack">重新上传简历</el-button>
	    </header>
	
	    <!-- 加载态：三段式准备卡 -->
	    <div v-if="phase === 'loading'" class="rounded-lg border border-gray-200 p-8">
	      <h2 class="text-lg font-semibold">AI 正在为你准备面试</h2>
	      <!-- 三段进度：第 1 段已知完成（简历已上传），后两段在接口内完成 -->
	      <ol class="mt-5 space-y-4">
	        <li class="flex items-center gap-3">
	          <el-icon class="text-green-500"><i-ep-check /></el-icon>
	          <span>简历已上传</span>
	        </li>
	        <li class="flex items-center gap-3 text-gray-700">
	          <el-icon class="is-loading text-blue-500"><i-ep-loading /></el-icon>
	          <span>解析简历并检索题库</span>
	        </li>
	        <li class="flex items-center gap-3 text-gray-400">
	          <el-icon><i-ep-more /></el-icon>
	          <span>生成面试题</span>
	        </li>
	      </ol>
	      <p class="mt-6 text-sm text-gray-500">
	        全链路约 6~9 秒（意图识别 → 简历解析 → 题库检索 → 合成），请稍候
	      </p>
	      <!-- 骨架屏：避免白屏，让用户知道有内容即将出现 -->
	      <el-skeleton class="mt-6" :rows="4" animated />
	    </div>
	
	    <!-- 错误态：保留重试入口 -->
	    <div v-else-if="phase === 'error'" class="rounded-lg border border-red-200 bg-red-50 p-8">
	      <h2 class="text-lg font-semibold text-red-700">出题失败</h2>
	      <p class="mt-2 text-sm text-red-600">{{ errorMsg }}</p>
	      <div class="mt-5 flex gap-3">
	        <el-button type="primary" @click="onRetry">重试</el-button>
	        <el-button @click="onBack">返回上传页</el-button>
	      </div>
	      <p class="mt-4 text-xs text-gray-500">
	        常见原因：Python 服务未启动（:8100）、内部令牌不匹配、简历 URL 过期
	      </p>
	    </div>
	
	    <!-- 就绪态：简历评估 + 题目列表 -->
	    <div v-else-if="result">
	      <!-- 闲聊分支：不展示题目 -->
	      <el-alert v-if="result.intent === 'SMALL_TALK'" type="info" :closable="false">
	        {{ result.small_talk || '（闲聊回复）' }}
	      </el-alert>
	
	      <template v-else>
	        <!-- 简历评估卡：仅有简历时才有分数 -->
	        <section v-if="result.resume_score !== null" class="mb-6 rounded-lg bg-gray-50 p-5">
	          <div class="flex items-baseline gap-3">
	            <span class="text-3xl font-bold">{{ result.resume_score }}</span>
	            <span class="text-sm text-gray-500">/ 100 简历评分</span>
	            <el-tag v-if="result.resume_type" size="small" class="ml-auto">
	              {{ result.resume_type }}
	            </el-tag>
	          </div>
	          <ul v-if="result.resume_suggest.length" class="mt-3 list-inside list-disc space-y-1 text-sm text-gray-600">
	            <li v-for="(s, i) in result.resume_suggest" :key="i">{{ s }}</li>
	          </ul>
	        </section>
	
	        <!-- 题目列表 -->
	        <section>
	          <div class="mb-3 flex items-center justify-between">
	            <h2 class="text-lg font-semibold">
	              共 {{ result.questions.length }} 道题
	            </h2>
	            <el-tag size="small" type="info">{{ sourceLabel(result.questions_source) }}</el-tag>
	          </div>
	
	          <ol class="space-y-3">
	            <li
	              v-for="(q, i) in result.questions"
	              :key="i"
	              class="rounded-lg border border-gray-200 p-4 leading-relaxed"
	            >
	              <span class="mr-2 font-semibold text-gray-400">{{ i + 1 }}.</span>{{ q }}
	            </li>
	          </ol>
	        </section>
	
	        <!-- 耗时明细：来自后端 steps_trace，用于自查性能 -->
	        <footer class="mt-8 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
	          <span class="font-medium">耗时</span>
	          <span v-for="(ms, k) in result.steps_trace" :key="k" class="ml-3">
	            {{ k }}: {{ ms }}ms
	          </span>
	        </footer>
	
	        <!-- 后半入口：答题功能未实现，先禁用 -->
	        <el-button type="primary" size="large" class="mt-6" disabled>
	          开始答题（7C2 后半实现）
	        </el-button>
	      </template>
	    </div>
	  </div>
</template>
