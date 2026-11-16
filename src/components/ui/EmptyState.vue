<script setup lang="ts">
/** 空态：虚线框 + 一句解释 + 可选动作。全站统一，避免每个页面各写一套 */
defineProps<{ title: string; desc?: string }>()
</script>

<template>
	<div class="rounded-[3px] border border-dashed border-rule-strong px-8 py-14 text-center">
		<div class="font-display text-[17px] text-ink">{{ title }}</div>
		<p v-if="desc" class="mx-auto mt-2 max-w-[42ch] text-[13px] leading-[1.8] text-muted">{{ desc }}</p>
		<div class="mt-6">
			<slot />
		</div>
	</div>
</template>
