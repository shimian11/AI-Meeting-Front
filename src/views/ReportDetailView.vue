<script setup lang="ts">
/**
 * 报告详情：总分 + 五维雷达 + 逐题复盘。
 * 数据来源：`GET /interview/interview/record/{sessionId}`。
 *
 * ⚠️ 后端 `InterviewRecordRespDTO` 的字段名可能与 `ReportDetail` 不完全一致，
 *    联调时以真实报文为准修正 `types.ts`——这正是「先用真接口」的目的。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { getReportDetail } from '@/api/interview'
import type { ReportDetail } from '@/api/types'
import { formatTime } from '@/utils/datetime'

const route = useRoute()
const sessionId = String(route.params.sessionId ?? '')

const loading = ref(true)
const detail = ref<ReportDetail | null>(null)
const errorMsg = ref('')

async function load() {
	loading.value = true
	errorMsg.value = ''
	try {
		detail.value = await getReportDetail(sessionId)
	} catch (e) {
		errorMsg.value = e instanceof Error ? e.message : '加载失败'
	} finally {
		loading.value = false
	}
}

onMounted(load)

/* 雷达：0~100 映射到半径 92 的五边形（居中 110,110） */
const CX = 110
const CY = 110
const R = 92

/**
 * 雷达轴的展示元数据：**按 `key` 查**，不用后端的 `label`。
 *
 * <p>两个原因：① 后端 label 是英文（Resume / Interview / Skills…），直接画会出现英文轴名；
 * ② 神态维一期不做（ADR-009），分数恒 0，必须靠 key 过滤掉，否则雷达会凹陷一个角。</p>
 */
const RADAR_META: Record<string, { label: string; hidden?: boolean }> = {
	resume_score: { label: '简历' },
	interview_performance: { label: '面试表现' },
	professional_skills: { label: '专业技能' },
	potential_index: { label: '潜力' },
	demeanor_evaluation: { label: '神态', hidden: true },
}

/**
 * 雷达维度：优先用后端算好的 `radarDimensions`（顺序以后端为准）；
 * 为空时从 `radarChart` 兜底映射，顺序与上面保持一致。
 */
const radar = computed(() => {
	const dims = detail.value?.radarDimensions ?? []
	if (dims.length) {
		return dims
			.filter((d) => !RADAR_META[d.key]?.hidden)
			.map((d) => ({ label: RADAR_META[d.key]?.label ?? d.label, score: d.score ?? 0 }))
	}

	const rc = detail.value?.radarChart
	if (!rc) return []
	return [
		{ label: '简历', score: rc.resumeScore ?? 0 },
		{ label: '面试表现', score: rc.interviewPerformance ?? 0 },
		{ label: '专业技能', score: rc.professionalSkills ?? 0 },
		{ label: '潜力', score: rc.potentialIndex ?? 0 },
	]
})

/** 总评三块（总评正文单独展示）：亮点 / 改进 / 下一步 */
const reviewGroups = computed(() => {
	const fb = detail.value?.reviewFeedback
	if (!fb) return []
	return [
		{ title: '亮点', items: fb.highlights, tone: 'text-success' },
		{ title: '改进建议', items: fb.improvementTips, tone: 'text-danger' },
		{ title: '下一步', items: fb.nextActions, tone: 'text-ink-2' },
	]
})

const axes = computed(() => {
	const n = radar.value.length || 5
	return radar.value.map((dim, i) => {
		const angle = (Math.PI * 2 * i) / n - Math.PI / 2
		const r = (Math.max(0, Math.min(100, dim.score)) / 100) * R
		return {
			...dim,
			x: CX + Math.cos(angle) * r,
			y: CY + Math.sin(angle) * r,
			lx: CX + Math.cos(angle) * (R + 24),
			ly: CY + Math.sin(angle) * (R + 24),
		}
	})
})

const polygon = computed(() => axes.value.map((a) => `${a.x},${a.y}`).join(' '))

function gridPolygon(ratio: number) {
	const n = radar.value.length || 5
	return Array.from({ length: n }, (_, i) => {
		const angle = (Math.PI * 2 * i) / n - Math.PI / 2
		const r = R * ratio
		return `${CX + Math.cos(angle) * r},${CY + Math.sin(angle) * r}`
	}).join(' ')
}
</script>

<template>
	<div>
		<PageHeader kicker="REPORT / 逐题复盘" :title="detail?.interviewDirection || '面试报告'" :desc="detail ? `${formatTime(detail.createTime)} · 会话 ${sessionId}` : `会话 ${sessionId}`">
			<template #actions>
				<RouterLink to="/interview/report" class="btn-ghost inline-block text-[13px] no-underline">返回列表</RouterLink>
			</template>
		</PageHeader>

		<div v-if="loading" class="panel px-6 py-10">
			<div class="space-y-3">
				<div v-for="n in 4" :key="n" class="h-3 animate-pulse rounded-[2px] bg-surface-2" :style="{ width: `${90 - n * 10}%` }" />
			</div>
		</div>

		<EmptyState v-else-if="errorMsg || !detail" title="报告加载失败" :desc="errorMsg || '未找到该会话的报告'">
			<button class="btn-ghost text-[14px]" @click="load">重试</button>
		</EmptyState>

		<div v-else class="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
			<section class="panel px-6 py-6">
				<div class="mono-label">总分</div>
				<div class="mt-2 flex items-end gap-3">
					<span class="font-mono text-[46px] leading-none tabular-nums">{{ detail.interviewScore ?? '—' }}</span>
					<span class="mb-1 text-[12px] text-muted">/ 100</span>
				</div>
				<div class="rule my-6" />
				<svg v-if="axes.length" viewBox="0 0 220 220" width="100%" role="img" aria-label="能力雷达图">
					<polygon v-for="r in [0.25, 0.5, 0.75, 1]" :key="r" :points="gridPolygon(r)" fill="none" stroke="rgba(18,46,138,.16)" stroke-width="0.8" />
					<polygon :points="polygon" fill="rgba(18,46,138,.10)" stroke="#122e8a" stroke-width="1.4" />
					<circle v-for="a in axes" :key="a.label" :cx="a.x" :cy="a.y" r="2.6" fill="#122e8a" />
					<text v-for="a in axes" :key="`t-${a.label}`" :x="a.lx" :y="a.ly" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#5d6288">{{ a.label }}</text>
				</svg>
				<p v-else class="mono-label">暂无雷达数据</p>
			</section>

			<section>
				<!-- 总评：后端 reviewFeedback（总评正文 / 亮点 / 改进 / 下一步） -->
				<article v-if="detail.reviewFeedback" class="panel mb-6 px-6 py-6">
					<div class="mono-label">总评</div>
					<p class="mt-2 text-[14px] leading-[1.9] text-ink-2">{{ detail.reviewFeedback.overallComment || '（无总评）' }}</p>

					<div v-for="g in reviewGroups" :key="g.title" class="mt-4">
						<div class="mono-label">{{ g.title }}</div>
						<ul v-if="g.items?.length" class="m-0 mt-1 list-none space-y-1 p-0">
							<li v-for="(s, i2) in g.items" :key="i2" class="text-[13px] leading-[1.8]" :class="g.tone">· {{ s }}</li>
						</ul>
						<p v-else class="mt-1 text-[12px] text-muted">—</p>
					</div>
				</article>

				<div class="mono-label mb-3">逐题复盘 · {{ detail.playbackItems?.length ?? 0 }}</div>
				<div v-if="!detail.playbackItems?.length" class="panel px-6 py-8 text-[13px] text-muted">该报告还没有逐题记录。</div>
				<div v-else class="space-y-4">
					<article v-for="item in detail.playbackItems" :key="item.seq ?? item.questionNumber ?? 0" class="panel px-6 py-5">
						<div class="flex items-start gap-4">
							<span class="mt-[3px] font-mono text-[12px] text-muted">{{ String(item.seq ?? 0).padStart(2, '0') }}</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="mono-label">第 {{ item.questionNumber ?? '—' }} 题</span>
									<span v-if="item.isFollowUp" class="rounded-[2px] border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] text-muted">追问</span>
								</div>
								<h3 class="mt-1 text-[15px] leading-[1.7]">{{ item.questionContent || '（题目缺失）' }}</h3>
								<p class="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-muted">答：{{ item.answerContent || '（未作答）' }}</p>
								<div class="rule my-4" />
								<p class="text-[13px] leading-[1.8] text-ink-2">{{ item.feedback || '（无点评）' }}</p>
							</div>
							<ScoreBadge :score="item.score ?? 0" />
						</div>
					</article>
				</div>
			</section>
		</div>
	</div>
</template>
