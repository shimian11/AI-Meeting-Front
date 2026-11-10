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
  <div class="mx-auto max-w-5xl px-6 py-10">
      <div class="grid gap-8 md:grid-cols-[1fr_280px]">
        <!-- 主区：标题说明 + 能力卡 + 上传 + CTA -->
        <section>
          <h1 class="text-3xl font-bold">AI 模拟面试</h1>
          <p class="mt-3 leading-relaxed text-gray-600">
            上传你的简历，AI 面试官会结合简历内容与题库为你定制一组面试题。
            逐题作答后，可获得多维度能力评估报告。
          </p>
  
          <!-- 能力卡 2×2：静态介绍，不参与交互 -->
          <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <el-card shadow="never">
              <div class="font-semibold">简历评估</div>
              <p class="mt-1 text-sm text-gray-500">0~100 评分 + 3~5 条改进建议</p>
            </el-card>
            <el-card shadow="never">
              <div class="font-semibold">定制出题</div>
              <p class="mt-1 text-sm text-gray-500">题库检索 + 简历定制，约 10 道</p>
            </el-card>
            <el-card shadow="never">
              <div class="font-semibold">动态追问</div>
              <p class="mt-1 text-sm text-gray-500">答得越好，追问层次越深</p>
            </el-card>
            <el-card shadow="never">
              <div class="font-semibold">能力报告</div>
              <p class="mt-1 text-sm text-gray-500">五维雷达 + 逐题复盘</p>
            </el-card>
          </div>
  
          <!-- 上传区：drag 拖拽 + 点击选择；http-request 接管真实上传 -->
          <div class="mt-8">
            <el-upload
              ref="uploadRef"
              v-model:file-list="resumeFile"
              class="w-full"
              drag
              accept=".pdf"
              :limit="1"
              :before-upload="beforeUpload"
              :http-request="customUpload"
              :on-remove="onRemove"
            >
              <div class="py-6 text-center">
                <p class="text-gray-600">把简历拖到这里，或点击选择文件</p>
                <p class="mt-1 text-xs text-gray-400">仅支持 PDF，最大 20MB</p>
              </div>
            </el-upload>
          </div>
  
          <!-- CTA：上传完成前禁用，文案随状态变化 -->
          <el-button
            type="primary"
            size="large"
            class="mt-6"
            :disabled="!canStart"
            :loading="phase === 'uploading'"
            data-test="btn-start"
            @click="onStart"
          >
            {{ phase === 'uploaded' ? '开始面试' : '请先上传简历' }}
          </el-button>
        </section>
  
        <!-- 右侧辅助栏：流程说明（静态） -->
        <aside class="h-fit rounded-lg bg-gray-50 p-5 text-sm">
          <h3 class="font-semibold text-gray-800">流程</h3>
          <ol class="mt-3 list-inside list-decimal space-y-2 text-gray-600">
            <li>上传简历，AI 解析并出题</li>
            <li>逐题作答，可能被追问</li>
            <li>生成能力报告与建议</li>
          </ol>
          <div class="mt-5 border-t border-gray-200 pt-4 text-xs text-gray-400">
            预计耗时 15~25 分钟
          </div>
        </aside>
      </div>
    </div>
</template>
