<script setup lang="ts">
/**
 * 用户档案：简历库 / 求职目标 / 知识库（三 tab）。
 *
 * ⚠️ 数据来源待接后端（`docs/front/02` §4.2）：
 *    简历列表、目标、知识库均无接口——本页只交付版式与空态。
 *    接数据时替换 `resumes` 与 `activeTab` 两侧的静态内容即可。
 */
import { ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const tabs = [
	{ key: 'resume', label: '简历库' },
	{ key: 'goal', label: '求职目标' },
	{ key: 'kb', label: '知识库' },
] as const

const activeTab = ref<(typeof tabs)[number]['key']>('resume')

/** 样例数据：仅用于展示卡片版式 */
const resumes = ref([
	{ name: '简历_2026_Java后端.pdf', size: '412 KB', uploadedAt: '2026-11-13' },
])

// 简历库：GET /users/{username}/resumes  →  { id, name, size, uploadedAt }
// 目标：GET/PUT /users/{username}/goal     →  { direction, level }
// 知识库：GET /knowledge/documents         →  { id, title, chunks, updatedAt }
</script>

<template>
	<div>
		<PageHeader kicker="PROFILE / 用户档案" title="我的档案" desc="简历、求职目标与知识库集中在这里，面试时按目标方向匹配题目。" />

		<div class="mb-8 flex gap-1 border-b border-rule">
			<button
				v-for="tab in tabs"
				:key="tab.key"
				class="relative -mb-px border-b-2 px-4 py-3 text-[14px] transition-colors"
				:class="activeTab === tab.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'"
				@click="activeTab = tab.key"
			>
				{{ tab.label }}
			</button>
		</div>

		<!-- 简历库 -->
		<section v-if="activeTab === 'resume'">
			<EmptyState v-if="resumes.length === 0" title="还没有简历" desc="上传一份 PDF 简历，出题时会据此定制题目。">
				<RouterLink to="/interview" class="btn-primary inline-block text-[14px] no-underline">去上传</RouterLink>
			</EmptyState>
			<div v-else class="panel divide-y divide-rule">
				<div v-for="r in resumes" :key="r.name" class="flex items-center gap-5 px-6 py-5">
					<div class="min-w-0 flex-1">
						<div class="truncate text-[14px] text-ink">{{ r.name }}</div>
						<div class="mono-label mt-1">{{ r.uploadedAt }} · {{ r.size }}</div>
					</div>
					<button class="btn-ghost text-[12px]">重新解析</button>
				</div>
			</div>
		</section>

		<!-- 求职目标 -->
		<section v-else-if="activeTab === 'goal'" class="panel px-8 py-7">
			<div class="mono-label mb-4">目标方向</div>
			<div class="flex flex-wrap gap-2">
				<span v-for="d in ['Java 后端', '通用', '算法', '前端']" :key="d"
					class="rounded-[2px] border border-rule px-3 py-1 text-[13px] text-ink-2">{{ d }}</span>
			</div>
			<div class="rule my-6" />
			<div class="mono-label mb-2">期望难度</div>
			<p class="text-[13px] leading-[1.8] text-muted">初级 / 中级 / 高级 —— 影响追问深度与评分基准。</p>
			<div class="mt-6 flex gap-3">
				<button class="btn-primary text-[14px]">保存目标</button>
				<span class="mono-label self-center">⚠️ 待接后端</span>
			</div>
		</section>

		<!-- 知识库 -->
		<section v-else>
			<EmptyState title="知识库由控制台上传" desc="题库入库在运营控制台（/admin/knowledge）完成，这里只读展示已入库内容。">
				<span class="mono-label">7C4 后开放</span>
			</EmptyState>
		</section>
	</div>
</template>
