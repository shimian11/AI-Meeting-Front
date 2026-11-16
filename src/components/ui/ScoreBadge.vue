<script setup lang="ts">
/**
 * 分数徽章：全站唯一允许「撞色」的元素之一（AGENT.md §6.1 语义铁律）。
 * 颜色只表达判定，不做装饰：
 *   ≥80 墨蓝（通过）· 60~79 中性灰（待提升）· <60 砖红（不合格）
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ score: number; size?: 'sm' | 'lg' }>(), { size: 'sm' })

const tone = computed(() => {
	if (props.score >= 80) return 'border-ink text-ink'
	if (props.score >= 60) return 'border-rule-strong text-muted'
	return 'border-danger text-danger'
})

const box = computed(() => (props.size === 'lg' ? 'h-[56px] w-[56px] text-[24px]' : 'h-[30px] w-[30px] text-[15px]'))
</script>

<template>
	<div
		class="inline-flex items-center justify-center rounded-[2px] border font-mono tabular-nums"
		:class="[tone, box]"
	>
		{{ score }}
	</div>
</template>
