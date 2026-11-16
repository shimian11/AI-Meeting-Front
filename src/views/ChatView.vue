<script setup lang="ts">
/**
 * AI 对话（7C3）——静态壳。
 *
 * ⚠️ 手敲范围（R16）：SSE 消费由用户实现。
 *    Java 侧 `POST /agents/sessions/{id}/chat` 当前是桩（通用对话流式未接入），
 *    因此本轮只交版式：
 *      1. 消息流（用户右 / 助手左）
 *      2. 流式占位光标
 *      3. 输入区与发送态
 *    接入时把 `messages` 换成真实会话数据，`onSend` 里接 EventSource/fetch-stream。
 */
import { nextTick, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'

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

async function scrollToBottom() {
	await nextTick()
	if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

/** ⚠️ 待你实现：接 SSE（Java /agents/sessions/{id}/chat） */
async function onSend() {
	const text = draft.value.trim()
	if (!text) return
	messages.value.push({ role: 'user', content: text })
	draft.value = ''
	await scrollToBottom()

	// 占位回声：仅用于展示流式样式，不调用接口
	const reply: Msg = { role: 'assistant', content: '', streaming: true }
	messages.value.push(reply)
	for (const ch of '（此处为版式占位）接入 SSE 后，这里会逐字出现模型回复。') {
		reply.content += ch
		await new Promise((r) => setTimeout(r, 24))
		await scrollToBottom()
	}
	reply.streaming = false
}

/** Enter 发送，Shift+Enter 换行 */
function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault()
		void onSend()
	}
}
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
