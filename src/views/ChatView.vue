<script setup lang="ts">
/**
 * AI 对话
 *    Java 侧 `POST /agents/sessions/{id}/chat` 当前是桩（通用对话流式未接入），
 *    因此本轮只交版式：
 *      1. 消息流（用户右 / 助手左）
 *      2. 流式占位光标
 *      3. 输入区与发送态
 *    接入时把 `messages` 换成真实会话数据，`onSend` 里接 EventSource/fetch-stream。
 */
import { nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/ui/PageHeader.vue'
import { tokenStore } from '@/api/client'

interface Msg {
	role: 'user' | 'assistant'
	content: string
	/** 流式接收中：显示光标 */
	streaming?: boolean
}

const messages = ref<Msg[]>([
	{ role: 'assistant', content: '你好，我是面试助手。可以问我简历怎么改、某道题怎么答，或者让我陪你过一遍项目经历。' },
])
const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
/** 发送中：防止重复提交，同时驱动按钮禁用态 */
const sending = ref(false)
/** 会话 id：进页面时创建（后端 POST /agents/sessions） */
const sessionId = ref('')

/**
 * 进页面暂时**不建会话**。
 */
onMounted(async () => {
	await nextTick()
	scrollToBottom()
})

async function scrollToBottom() {
	await nextTick()
	if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

/** 发送并消费 SSE 事件流 */
async function onSend() {
	const text = draft.value.trim()
	if (!text || sending.value) return
	if (!sessionId.value) {
		ElMessage.warning('通用对话还没接入（D 阶段）：后端 SSE 接口尚未实现')
		return
	}
	messages.value.push({ role: 'user', content: text })
	draft.value = ''
	sending.value = true
	const reply: Msg = { role: 'assistant', content: '', streaming: true }
	messages.value.push(reply)
	
	try {
		const res = await fetch(`/api/banma/v1/agents/sessions/${sessionId}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${tokenStore.get()}`,
			},
			body: JSON.stringify({ message: text }),
		})
		if (!res.body) throw new Error('响应无流')
		
		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''
		
		while(true) {
			const { done, value } = await reader.read()
			if(done) break
			buffer += decoder.decode(value, { stream: true })
			// SSE 以空行分隔事件；逐行解析 data:
			const chunks = buffer.split('\n\n')
			buffer = chunks.pop() ?? ''
			for(const raw of chunks) {
				const line = raw.split('\n').find((l) => l.startsWith('data:'))
				if(!line) continue
				const payload = line.slice(5).trim()
				if(payload === '[DONE]') break
				reply.content += payload
				await scrollToBottom()
			}
		}
	} catch (e) {
		reply.content ||= '（对话失败：后端 SSE 尚未接入）'
	} finally {
		reply.streaming = false
		sending.value = false
	}
}

/** Enter 发送，Shift+Enter 换行 */
function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault()
		void onSend()
	}
}

onMounted(async () => {
	const s = await api.post<{sessionId: string}>('/agents/sessions', {})
	sessionId.value = s.sessionId
})
</script>

<template>
	<div class="flex h-[calc(100vh-160px)] flex-col">
		<PageHeader kicker="CHAT / 面试助手" title="对话" desc="随时提问。对话不进入面试评分。" />

		<div ref="listEl" class="min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
			<div v-for="(m, i) in messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
				<div
					class="max-w-[76%] rounded-[3px] border px-5 py-3 text-[14px] leading-[1.9]"
					:class="m.role === 'user' ? 'border-rule-strong bg-accent-soft text-ink' : 'border-rule bg-paper-hi text-ink-2'"
				>
					{{ m.content }}<span v-if="m.streaming" class="ml-[2px] inline-block h-[14px] w-[2px] animate-pulse bg-ink align-middle" />
				</div>
			</div>
		</div>

		<div class="border-t border-rule pt-5">
			<div class="flex items-end gap-3">
				<textarea
					v-model="draft"
					rows="2"
					placeholder="Enter 发送 · Shift + Enter 换行"
					class="min-h-[56px] w-full resize-none rounded-[3px] border border-rule bg-paper-hi px-4 py-3 text-[14px] leading-[1.8] text-ink outline-none focus:border-rule-strong"
					@keydown="onKeydown"
				/>
				<button class="btn-primary shrink-0 text-[14px]" :disabled="!draft.trim()" @click="onSend">发送</button>
			</div>
			<p class="mono-label mt-3">⚠️ SSE 待接：POST /agents/sessions/{id}/chat</p>
		</div>
	</div>
</template>
