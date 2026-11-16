<script setup lang="ts">
/**
 * 页面职责：
 *   1. 介绍 AI 模拟面试的流程与能力（静态展示）
 *   2. 上传简历 PDF，校验类型与大小
 *   3. 创建面试会话，跳转到面试间
 *
 * 状态机：idle（未选文件）→ uploading（上传中）→ uploaded（就绪可开始）
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type UploadFile, type UploadInstance, type UploadProps, type UploadUserFile } from 'element-plus'
import { createSession, uploadResume, type FileUploaded } from '@/api/interview'
import PageHeader from '@/components/ui/PageHeader.vue'


const router = useRouter()

/*------状态------*/

/** 已选中的文件列表（Element Plus 受控，limit=1 所以最多一个） */
const resumeFile = ref<UploadUserFile[]>([])
/** 页面阶段：控制按钮文案与可用性 */
const phase = ref<'idle' | 'uploading' | 'uploaded'>('idle')
/** 上传成功后的服务端信息，fileUrl 要传给面试间调出题接口 */
const uploaded = ref<FileUploaded | null>(null)
/** 上传组件引用，用于出错时清空文件列表 */
const uploadRef = ref<UploadInstance>()

/** 开始按钮是否可用：必须上传完成 */
const canStart = computed(() => phase.value === 'uploaded' && !!uploaded.value)

/** 能力卡文案（静态展示） */
const capabilities = [
	{ title: '简历评估', desc: '0~100 评分，附 3~5 条改进建议' },
	{ title: '定制出题', desc: '题库检索 + 简历定制，约 10 道' },
	{ title: '动态追问', desc: '答得越好，追问层次越深' },
	{ title: '能力报告', desc: '五维雷达 + 逐题复盘' },
]

/** 右侧流程说明（静态展示） */
const steps = ['上传简历，AI 解析并出题', '逐题作答，可能被追问', '生成能力报告与建议']

/* ---------- 方法 ---------- */

/**
 * 选择文件后、上传前的校验
 * @returns false 会中断上传（Element Plus 的约定）
 */
const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
	// 只收 PDF：后端解析用 pypdf，其他格式会直接失败
	if (rawFile.type !== 'application/pdf') {
		ElMessage.error('只支持 PDF 格式的简历')
		return false
	}
	// 20MB 上限来自 ADR-016（上传大小约束）
	if (rawFile.size > 20 * 1024 * 1024) {
	    ElMessage.error('简历不能超过 20MB')
	    return false
	}
	return true
}

/**
 * 自定义上传：接管 Element Plus 默认的 action 行为
 *
 * 步骤：
 *   1. 置为 uploading，按钮进入 loading
 *   2. 调 uploadResume，成功后记录 fileUrl 并置 uploaded
 *   3. 失败则回滚到 idle 并清空文件列表（允许重新选）
 */
const customUpload: UploadProps['httpRequest'] = async (options) => {
	phase.value = 'uploading'
	try{
		// options.file 是浏览器原始 File 对象
		uploaded.value = await uploadResume(options.file as File)
		phase.value = 'uploaded'
		ElMessage.success('简历上传成功')
	} catch {
		// 错误提示已由 axios 拦截器统一弹出，这里只回滚状态
		phase.value = 'idle'
		uploaded.value = null
		resumeFile.value = []
		uploadRef.value?.clearFiles()
	}
}

/**
 * 移除已选文件：状态全部清空，回到初始态
 */
function onRemove() {
	resumeFile.value = []
	uploaded.value = null
	phase.value = 'idle'
}

/**
 * 开始面试
 *
 * 步骤：
 *   1. 创建会话，拿 sessionId
 *   2. 带 sessionId 跳转到面试间路由，fileUrl 放 query 供出题使用
 *      （放 query 而不是全局 store，是为了刷新页面后仍能恢复出题参数）
 */
async function onStart() {
	if(!uploaded.value) {
		ElMessage.warning('请先上传简历')
		return
	}
	try{
		const session = await createSession()
		await router.push({
			path: `/interview/${session.sessionId}`,
			query: { resumeUrl: uploaded.value.fileUrl },
		})
	} catch {
		 /* 创建失败：拦截器已提示，停留在本页 */
	}
}
</script>

<template>
	<div>
		<PageHeader
			kicker="AI INTERVIEW / 面试登记"
			title="AI 模拟面试"
			desc="上传简历后，面试官会结合简历内容与题库定制一组题目。逐题作答，结束时给出多维能力报告。"
		/>

		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
			<section>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div v-for="cap in capabilities" :key="cap.title" class="panel px-5 py-4">
						<div class="font-display text-[15px] text-ink">{{ cap.title }}</div>
						<p class="mt-1 text-[12px] leading-[1.7] text-muted">{{ cap.desc }}</p>
					</div>
				</div>

				<div class="rule my-8" />

				<div class="mono-label mb-3">简历上传</div>
				<el-upload
					ref="uploadRef"
					v-model:file-list="resumeFile"
					class="intro-upload w-full"
					drag
					accept=".pdf"
					:limit="1"
					:before-upload="beforeUpload"
					:http-request="customUpload"
					:on-remove="onRemove"
				>
					<div class="px-6 py-10 text-center">
						<p class="text-[14px] text-ink">把简历拖到这里，或点击选择</p>
						<p class="mono-label mt-2">PDF ONLY · MAX 20MB</p>
					</div>
				</el-upload>

				<div class="mt-8 flex items-center gap-4">
					<button
						class="btn-primary text-[15px]"
						:disabled="!canStart"
						data-test="btn-start"
						@click="onStart"
					>
						{{ phase === 'uploading' ? '上传中…' : phase === 'uploaded' ? '开始面试' : '请先上传简历' }}
					</button>
					<span v-if="uploaded" class="mono-label">已就绪 · {{ uploaded.fileName ?? '简历.pdf' }}</span>
				</div>
			</section>

			<aside class="h-fit">
				<div class="mono-label mb-3">流程</div>
				<ol class="m-0 list-none space-y-4 p-0">
					<li v-for="(step, idx) in steps" :key="step" class="flex gap-3">
						<span class="mt-[3px] font-mono text-[11px] text-muted">{{ String(idx + 1).padStart(2, '0') }}</span>
						<span class="text-[13px] leading-[1.7] text-ink-2">{{ step }}</span>
					</li>
				</ol>
				<div class="rule my-6" />
				<div class="mono-label">预计 15~25 分钟</div>
			</aside>
		</div>
	</div>
</template>
