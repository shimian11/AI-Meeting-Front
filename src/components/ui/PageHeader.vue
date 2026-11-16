<script setup lang="ts">
/** 页面标题区：等宽小标签 + 衬线大标题 + 右侧动作槽 */
defineProps<{
	kicker?: string
	title: string
	desc?: string
}>()
</script>

<template>
	<header class="mb-10 flex items-end justify-between gap-6">
		<div class="min-w-0">
			<div v-if="kicker" class="mono-label">{{ kicker }}</div>
			<h1 class="mt-2 text-[30px] leading-[1.3]">{{ title }}</h1>
			<p v-if="desc" class="mt-3 max-w-[52ch] text-[14px] leading-[1.8] text-muted">{{ desc }}</p>
		</div>
		<div class="shrink-0">
			<slot name="actions" />
		</div>
	</header>
</template>
