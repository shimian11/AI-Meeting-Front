<script setup lang="ts">
/**
 * 用户档案：左侧三标签页（简历库 / 求职目标 / 知识库）+ 右侧「档案概览」。
 *
 * ⚠️ 数据来源待接后端（`docs/front/02` §4.3 · K12）：
 *    ① 用户维度多简历列表  ② 方向偏好与目标岗位  ③ 知识库条目 —— 三组接口均未实现。
 *    本页只交付**版式与交互骨架**，下面的数据全部是样例；接后端时替换常量即可，
 *    `activeTab`/`selectedDirection` 这类纯 UI 状态保留。
 *
 * 交互留白（等接口，不在本页实现）：
 *    设默认 / 上传新版本 / 删除简历 · 切方向保存 / 新增岗位 / 删除岗位 ·
 *    类型筛选 / 状态循环 / 新增知识条目
 */
import { computed, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

/** 三个标签页 */
const tabs = [
	{ key: 'resume', label: '简历库' },
	{ key: 'goal', label: '求职目标' },
	{ key: 'kb', label: '知识库' },
] as const

const activeTab = ref<(typeof tabs)[number]['key']>('resume')

/** 当前选中的面试方向（切了会同步侧栏与面试入口，接后端前只在本页生效） */
const selectedDirection = ref('Java 后端')

/** 可选方向：与出题官的 direction 归一化口径一致 */
const directions = ['Java 后端', '前端', '全栈', '数据算法']

// ─────────────────────────── 样例数据（接后端后整块替换）───────────────────────────

/** 简历库：GET /users/{username}/resumes → [{ id, name, direction, pages, size, updatedAt, isDefault }] */
const resumes = ref([
	{ id: 'r1', name: '简历_2026_Java后端.pdf', direction: 'Java 后端', pages: 2, size: '412 KB', updatedAt: '2026-11-13', isDefault: true },
	{ id: 'r2', name: '简历_2026_全栈版.pdf', direction: '全栈', pages: 2, size: '388 KB', updatedAt: '2026-10-28', isDefault: false },
	{ id: 'r3', name: '简历_实习版.pdf', direction: 'Java 后端', pages: 1, size: '196 KB', updatedAt: '2026-09-15', isDefault: false },
])

/** 默认简历（概览用） */
const defaultResume = computed(() => resumes.value.find((r) => r.isDefault) ?? null)

/** 目标岗位：GET /users/{username}/jobs → [{ id, company, role, city, status }] */
const jobs = ref([
	{ id: 'j1', company: '某电商平台', role: 'Java 后端开发', city: '杭州', status: '面试中' },
	{ id: 'j2', company: '某云服务厂商', role: '后端开发（中间件）', city: '深圳', status: '已投递' },
	{ id: 'j3', company: '某金融科技', role: 'Java 工程师', city: '上海', status: '已拿 offer' },
])

/** 岗位进度四态与配色 */
const JOB_STATUS_TONE: Record<string, string> = {
	已投递: 'text-muted',
	面试中: 'text-ink',
	'已拿 offer': 'text-success',
	已挂: 'text-muted line-through',
}

/** 知识库：GET /knowledge/entries → [{ id, title, tags, type, status, updatedAt }] */
const entries = ref([
	{ id: 'k1', title: 'JVM 内存模型与 GC 调优', tags: ['JVM', 'GC'], type: '八股', status: '已掌握', updatedAt: '2026-11-12' },
	{ id: 'k2', title: 'MySQL 索引失效的 8 种场景', tags: ['MySQL', '索引'], type: '八股', status: '复习中', updatedAt: '2026-11-11' },
	{ id: 'k3', title: '字节跳动一面复盘（后端）', tags: ['面经'], type: '面经', status: '复习中', updatedAt: '2026-11-08' },
	{ id: 'k4', title: 'Redis 缓存穿透/击穿/雪崩方案对比', tags: ['Redis', '缓存'], type: '八股', status: '未复习', updatedAt: '2026-11-05' },
	{ id: 'k5', title: '手写 LRU + 并发安全改造', tags: ['算法', '并发'], type: '算法', status: '未复习', updatedAt: '2026-11-02' },
	{ id: 'k6', title: '项目复盘：订单系统分库分表', tags: ['复盘', '分库分表'], type: '复盘', status: '已掌握', updatedAt: '2026-10-30' },
])

/** 知识库状态三态与配色 */
const KB_STATUS_TONE: Record<string, string> = {
	已掌握: 'text-success',
	复习中: 'text-ink',
	未复习: 'text-muted',
}

/** 知识库顶部统计 */
const kbStats = computed(() => {
	const total = entries.value.length
	const mastered = entries.value.filter((e) => e.status === '已掌握').length
	const reviewing = entries.value.filter((e) => e.status === '复习中').length
	return { total, mastered, reviewing, pending: total - mastered - reviewing }
})
</script>

<template>
	<div>
		<PageHeader
			kicker="PROFILE / 用户档案"
			title="我的档案"
			desc="简历、求职目标与知识库集中在这里；面试默认用「默认简历 + 目标方向」出题。"
		/>

		<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_264px]">
			<!-- ══════════ 左：三标签页 ══════════ -->
			<div class="min-w-0">
				<div class="mb-6 flex gap-1 border-b border-rule">
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

				<!-- ── 简历库 ── -->
				<section v-if="activeTab === 'resume'">
					<EmptyState v-if="resumes.length === 0" title="还没有简历" desc="上传一份 PDF 简历（≤20MB），出题时会据此定制题目。">
						<RouterLink to="/interview" class="btn-primary inline-block text-[14px] no-underline">去上传</RouterLink>
					</EmptyState>

					<template v-else>
						<div class="mb-4 flex items-center justify-between">
							<span class="mono-label">{{ resumes.length }} 个版本 · 默认用于面试</span>
							<button class="btn-primary text-[13px]">上传新版本</button>
						</div>

						<div class="panel divide-y divide-rule">
							<div v-for="r in resumes" :key="r.id" class="flex items-center gap-4 px-6 py-5">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate text-[14px] text-ink">{{ r.name }}</span>
										<span
											v-if="r.isDefault"
											class="shrink-0 rounded-[2px] border border-ink px-1.5 py-0.5 mono-label text-ink"
										>默认</span>
									</div>
									<div class="mono-label mt-1">{{ r.direction }} · {{ r.pages }} 页 · {{ r.size }} · {{ r.updatedAt }}</div>
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<button v-if="!r.isDefault" class="btn-ghost text-[12px]">设为默认</button>
									<button class="btn-ghost text-[12px] text-muted">删除</button>
								</div>
							</div>
						</div>

						<p class="mono-label mt-3 text-muted">⚠️ 数据来源待接后端：列表 / 设默认 / 上传 / 删除均未接接口</p>
					</template>
				</section>

				<!-- ── 求职目标 ── -->
				<section v-else-if="activeTab === 'goal'" class="space-y-6">
					<div class="panel px-6 py-6">
						<div class="mono-label mb-3">面试方向</div>
						<div class="flex flex-wrap gap-2">
							<button
								v-for="d in directions"
								:key="d"
								class="rounded-[2px] border px-3 py-1.5 text-[13px] transition-colors"
								:class="selectedDirection === d ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink'"
								@click="selectedDirection = d"
							>
								{{ d }}
							</button>
						</div>
						<p class="mono-label mt-3 text-muted">切方向后，面试入口的默认方向与出题口径同步变化</p>
					</div>

					<div class="panel">
						<div class="flex items-center justify-between border-b border-rule px-6 py-4">
							<span class="mono-label">目标岗位 · {{ jobs.length }}</span>
							<button class="btn-primary text-[13px]">新增岗位</button>
						</div>

						<div v-if="jobs.length === 0" class="px-6 py-10 text-center text-[13px] text-muted">
							还没有记录岗位，面试前先列一下目标公司会更有方向
						</div>
						<div v-else class="divide-y divide-rule">
							<div v-for="j in jobs" :key="j.id" class="flex items-center gap-4 px-6 py-4">
								<div class="min-w-0 flex-1">
									<div class="truncate text-[14px] text-ink">{{ j.company }} · {{ j.role }}</div>
									<div class="mono-label mt-1">{{ j.city }}</div>
								</div>
								<span class="shrink-0 text-[13px]" :class="JOB_STATUS_TONE[j.status] ?? 'text-muted'">{{ j.status }}</span>
								<button class="btn-ghost shrink-0 text-[12px] text-muted">删除</button>
							</div>
						</div>
					</div>

					<p class="mono-label text-muted">⚠️ 数据来源待接后端：方向偏好与岗位记录均未接接口</p>
				</section>

				<!-- ── 知识库 ── -->
				<section v-else>
					<EmptyState v-if="entries.length === 0" title="知识库还是空的" desc="题库入库在运营控制台完成；个人笔记与复盘条目会在这里汇总。">
						<span class="mono-label">新增条目待接后端</span>
					</EmptyState>

					<template v-else>
						<div class="mb-4 grid grid-cols-4 gap-3">
							<div v-for="s in [
								{ label: '合计', value: kbStats.total, tone: 'text-ink' },
								{ label: '复习中', value: kbStats.reviewing, tone: 'text-ink-2' },
								{ label: '已掌握', value: kbStats.mastered, tone: 'text-success' },
								{ label: '未开始', value: kbStats.pending, tone: 'text-muted' },
							]" :key="s.label" class="panel px-4 py-3">
								<div class="mono-label">{{ s.label }}</div>
								<div class="mt-1 text-[20px] font-semibold leading-none" :class="s.tone">{{ s.value }}</div>
							</div>
						</div>

						<div class="panel">
							<div class="flex items-center justify-between border-b border-rule px-6 py-4">
								<span class="mono-label">条目 · {{ entries.length }}</span>
								<div class="flex items-center gap-2">
									<button class="btn-ghost text-[12px]">全部</button>
									<button class="btn-ghost text-[12px]">八股</button>
									<button class="btn-ghost text-[12px]">面经</button>
									<button class="btn-ghost text-[12px]">复盘</button>
									<button class="btn-ghost text-[12px]">算法</button>
								</div>
							</div>

							<div class="divide-y divide-rule">
								<div v-for="e in entries" :key="e.id" class="flex items-center gap-4 px-6 py-4">
									<div class="min-w-0 flex-1">
										<div class="truncate text-[14px] text-ink">{{ e.title }}</div>
										<div class="mono-label mt-1">
											{{ e.type }}<span v-for="t in e.tags" :key="t"> · {{ t }}</span>
										</div>
									</div>
									<span class="shrink-0 text-[13px]" :class="KB_STATUS_TONE[e.status] ?? 'text-muted'">{{ e.status }}</span>
									<span class="mono-label shrink-0 text-muted">{{ e.updatedAt }}</span>
								</div>
							</div>
						</div>

						<p class="mono-label mt-3 text-muted">⚠️ 数据来源待接后端：筛选与状态循环未接接口</p>
					</template>
				</section>
			</div>

			<!-- ══════════ 右：档案概览 ══════════ -->
			<aside class="lg:sticky lg:top-6 lg:self-start">
				<div class="panel px-5 py-5">
					<div class="mono-label mb-4">档案概览</div>

					<dl class="space-y-3 text-[13px]">
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">简历版本</dt>
							<dd class="text-ink">{{ resumes.length }}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">默认简历</dt>
							<dd class="truncate text-right text-ink">{{ defaultResume?.name ?? '未设置' }}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">目标方向</dt>
							<dd class="text-ink">{{ selectedDirection }}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">目标岗位</dt>
							<dd class="text-ink">{{ jobs.length }}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">知识库</dt>
							<dd class="text-ink">{{ kbStats.total }}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="text-muted">已掌握</dt>
							<dd class="text-success">{{ kbStats.mastered }}</dd>
						</div>
					</dl>

					<div class="rule my-4" />

					<RouterLink to="/interview" class="btn-primary block text-center text-[13px] no-underline">
						用默认简历开始面试
					</RouterLink>
					<p class="mono-label mt-3 text-muted">计数随操作实时变；接后端后由接口驱动</p>
				</div>
			</aside>
		</div>
	</div>
</template>
