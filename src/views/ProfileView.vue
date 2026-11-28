<script setup lang="ts">
/**
 * 用户档案：左侧三标签页（简历库 / 求职目标 / 知识库）+ 右侧「档案概览」。
 *
 * 版式依据：`docs/front/02` §4.2、§4.4（删除与空态约定）。
 *
 * 数据来源现状：
 *   ✅ 简历库 —— 已接后端（B3-1）：GET /users/resumes、PUT /{id}/default、DELETE /{id}
 *   ⚠️ 求职目标 / 知识库 —— 仍是样例（B3-2 / B3-3 未实现），页面上有标注
 *
 * 约定：`previewUrl` 是预签名地址（7 天有效），**每次进页面都重新拉列表**，不缓存。
 */
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
	deleteResume,
	getResumes,
	setDefaultResume,
	uploadResume,
	type ResumeItem,
} from '@/api/interview'

/** 三个标签页 */
const tabs = [
	{ key: 'resume', label: '简历库' },
	{ key: 'goal', label: '求职目标' },
	{ key: 'kb', label: '知识库' },
] as const

const activeTab = ref<(typeof tabs)[number]['key']>('resume')

/** 当前选中的面试方向（B3-2 接后端前只在本页生效） */
const selectedDirection = ref('Java 后端')

/** 可选方向：与出题官的 direction 归一化口径一致 */
const directions = ['Java 后端', '前端', '全栈', '数据算法']

/* ══════════════════════════ 简历库（已接后端） ══════════════════════════ */

const resumes = ref<ResumeItem[]>([])
const loading = ref(false)
/** 隐藏的文件选择器：所有「上传」入口共用 */
const fileInput = ref<HTMLInputElement | null>(null)

/** 拉列表：每次都会拿到新签发的 previewUrl */
async function loadResumes() {
	loading.value = true
	try {
		resumes.value = await getResumes()
	} finally {
		loading.value = false
	}
}

onMounted(loadResumes)

/** 默认简历（概览用） */
const defaultResume = computed(() => resumes.value.find((r) => r.isDefault === 1) ?? null)

/** 选文件后上传，成功后刷新列表（首份会自动成为默认） */
async function onFilePicked(e: Event) {
	const input = e.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = '' // 允许重复选同一个文件
	if (!file) return
	try {
		await uploadResume(file)
		ElMessage.success('简历上传成功')
		await loadResumes()
	} catch {
		/* 错误提示由 axios 拦截器统一弹出 */
	}
}

/** 设为默认 */
async function onSetDefault(id: string) {
	try {
		await setDefaultResume(id)
		ElMessage.success('已设为默认简历')
		await loadResumes()
	} catch {
		/* 拦截器已提示 */
	}
}

/** 删除简历：确认后逻辑删除；删的是默认时后端会自动顺延一份 */
async function onDelete(r: ResumeItem) {
	try {
		await ElMessageBox.confirm(
			`删除「${r.fileName}」？已生成的面试报告不受影响。`,
			'删除简历',
			{ confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
		)
	} catch {
		return // 用户点取消
	}
	await deleteResume(r.id)
	ElMessage.success('已删除')
	await loadResumes()
}

/** 打开预签名预览（7 天有效；从接口现取，不缓存） */
function onPreview(r: ResumeItem) {
	if (!r.previewUrl) {
		ElMessage.warning('该简历没有可预览的文件')
		return
	}
	window.open(r.previewUrl, '_blank', 'noopener')
}

/** 字节数转可读单位 */
function formatSize(bytes: number) {
	if (!bytes || bytes <= 0) return '—'
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 毫秒时间戳转日期（后端 Date 序列化为数字） */
function formatDate(ts: number) {
	if (!ts) return '—'
	return new Date(ts).toLocaleDateString('zh-CN')
}

/* ══════════════════ 求职目标 / 知识库（⚠️ 样例，B3-2 / B3-3 接） ══════════════════ */

/** 目标岗位：GET /users/profile/jobs → [{ id, company, role, city, status }] */
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

		<!-- 隐藏文件选择器：所有「上传简历」入口共用 -->
		<input
			ref="fileInput"
			type="file"
			accept="application/pdf"
			class="hidden"
			@change="onFilePicked"
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

				<!-- ── 简历库（已接后端） ── -->
				<section v-if="activeTab === 'resume'">
					<EmptyState v-if="!loading && resumes.length === 0" title="还没有简历" desc="上传一份 PDF 简历（≤20MB），出题时会据此定制题目。">
						<button class="btn-primary text-[14px]" @click="fileInput?.click()">上传简历</button>
					</EmptyState>

					<template v-else>
						<div class="mb-4 flex items-center justify-between">
							<span class="mono-label">
								{{ loading ? '加载中…' : `${resumes.length} 个版本 · 默认用于面试` }}
							</span>
							<button class="btn-primary text-[13px]" @click="fileInput?.click()">上传新版本</button>
						</div>

						<div class="panel divide-y divide-rule">
							<div v-for="r in resumes" :key="r.id" class="flex items-center gap-4 px-6 py-5">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate text-[14px] text-ink">{{ r.fileName }}</span>
										<span
											v-if="r.isDefault === 1"
											class="shrink-0 rounded-[2px] border border-ink px-1.5 py-0.5 mono-label text-ink"
										>默认</span>
									</div>
									<div class="mono-label mt-1">{{ formatSize(r.fileSize) }} · {{ formatDate(r.updateTime) }}</div>
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<button class="btn-ghost text-[12px]" @click="onPreview(r)">预览</button>
									<button v-if="r.isDefault !== 1" class="btn-ghost text-[12px]" @click="onSetDefault(r.id)">设为默认</button>
									<button class="btn-ghost text-[12px] text-muted" @click="onDelete(r)">删除</button>
								</div>
							</div>
						</div>
					</template>
				</section>

				<!-- ── 求职目标（⚠️ 样例） ── -->
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

					<p class="mono-label text-muted">⚠️ 求职目标仍是样例数据（B3-2 接后端：方向偏好 + 岗位记录）</p>
				</section>

				<!-- ── 知识库（⚠️ 样例） ── -->
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

						<p class="mono-label mt-3 text-muted">⚠️ 知识库仍是样例数据（B3-3 接后端）</p>
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
							<dd class="truncate text-right text-ink">{{ defaultResume?.fileName ?? '未设置' }}</dd>
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
					<p class="mono-label mt-3 text-muted">
						{{ defaultResume ? `将使用：${defaultResume.fileName}` : '还没有默认简历，先去上传' }}
					</p>
				</div>
			</aside>
		</div>
	</div>
</template>
