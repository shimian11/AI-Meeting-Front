<script setup lang="ts">
/**
 * 全局骨架：左侧栏 + 内容区。
 *
 * 为什么不用 Element Plus 的 Layout：原型是「纸面 + 墨线」的排版语言，
 * EP 的容器默认带阴影与圆角体系，覆盖成本高于自写 20 行。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tokenStore } from '@/api/client'

const route = useRoute()
const router = useRouter()

const collapsed = computed(() => route.meta.collapsed === true)

/** 导航项：只放「能走通」的入口，桩页面不进导航，避免用户点进死路 */
const navItems = [
	{ to: '/interview', label: '面试', hint: '上传简历 → 开考' },
	{ to: '/interview/report', label: '报告', hint: '历史成绩与复盘' },
	{ to: '/chat', label: '对话', hint: '随时提问' },
	{ to: '/profile', label: '档案', hint: '简历 / 目标 / 知识库' },
]

function logout() {
	tokenStore.clear()
	void router.push('/login')
}
</script>

<template>
	<div class="flex h-full min-h-screen bg-paper">
		<aside
			class="flex shrink-0 flex-col border-r border-rule bg-paper-hi"
			:style="{ width: collapsed ? '64px' : '248px' }"
		>
			<div class="px-5 pt-6 pb-4">
				<div class="font-display text-[18px] leading-none text-ink">斑马</div>
				<div v-if="!collapsed" class="mono-label mt-2">云面试 / BANMA</div>
			</div>

			<div class="rule mx-5" />

			<nav class="mt-4 flex flex-col gap-1 px-3">
				<RouterLink
					v-for="item in navItems"
					:key="item.to"
					:to="item.to"
					class="group rounded-[2px] px-3 py-2 no-underline transition-colors hover:bg-accent-soft"
					:class="route.path.startsWith(item.to) ? 'bg-accent-soft' : ''"
				>
					<div class="text-[15px] leading-tight text-ink">{{ item.label }}</div>
					<div v-if="!collapsed" class="mt-1 text-[11px] leading-tight text-muted">{{ item.hint }}</div>
				</RouterLink>
			</nav>

			<div class="mt-auto px-5 pb-6">
				<div class="rule mb-4" />
				<button class="mono-label cursor-pointer bg-transparent p-0 hover:text-ink" @click="logout">
					退出登录
				</button>
			</div>
		</aside>

		<main class="min-w-0 flex-1">
			<div class="mx-auto max-w-[980px] px-10 py-12">
				<slot />
			</div>
		</main>
	</div>
</template>
