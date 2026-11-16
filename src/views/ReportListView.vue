<script setup lang="ts">
/**
 * 报告列表：历史面试成绩入口。
 * 数据来源：`GET /interview/interview/records`（分页）。
 */
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { listReports } from '@/api/interview'
import type { ReportItem } from '@/api/types'

const loading = ref(true)
const reports = ref<ReportItem[]>([])
const errorMsg = ref('')

async function load() {
	loading.value = true
	errorMsg.value = ''
	try {
		const res = await listReports()
		reports.value = res.records ?? []
	} catch (e) {
		// 拦截器已弹过提示，这里只保留页面态与重试入口
		errorMsg.value = e instanceof Error ? e.message : '加载失败'
	} finally {
		loading.value = false
	}
}

onMounted(load)
</script>

<template>
	<div>
		<PageHeader kicker="REPORTS / 成绩记录" title="面试报告" desc="按时间倒序排列。点击任意一条进入逐题复盘。">
			<template #actions>
				<RouterLink to="/interview" class="btn-primary inline-block text-[14px] no-underline">新面试</RouterLink>
			</template>
		</PageHeader>

		<div v-if="loading" class="panel space-y-3 px-6 py-8">
			<div v-for="n in 3" :key="n" class="h-10 animate-pulse rounded-[2px] bg-surface-2" />
		</div>

		<EmptyState v-else-if="errorMsg" title="报告加载失败" :desc="errorMsg">
			<button class="btn-ghost text-[14px]" @click="load">重试</button>
		</EmptyState>

		<EmptyState v-else-if="reports.length === 0" title="还没有面试记录" desc="完成一次完整面试后，报告会出现在这里。">
			<RouterLink to="/interview" class="btn-primary inline-block text-[14px] no-underline">去开始第一次</RouterLink>
		</EmptyState>

		<div v-else class="panel divide-y divide-rule">
			<RouterLink
				v-for="row in reports"
				:key="row.sessionId"
				:to="`/interview/report/${row.sessionId}`"
				class="flex items-center gap-6 px-6 py-5 no-underline transition-colors hover:bg-accent-soft"
			>
				<ScoreBadge :score="row.totalScore ?? 0" />
				<div class="min-w-0 flex-1">
					<div class="text-[15px] text-ink">{{ row.direction || '综合面试' }}</div>
					<div class="mono-label mt-1">{{ row.createdAt }} · {{ row.questionCount ?? '—' }} 题</div>
				</div>
				<span class="mono-label shrink-0">查看复盘 →</span>
			</RouterLink>
		</div>
	</div>
</template>
