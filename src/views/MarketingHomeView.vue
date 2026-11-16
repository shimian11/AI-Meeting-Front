<script setup lang="ts">
/**
 * 营销首页（7C3）：未登录也可见的门面页。
 * 只做静态展示 + 两个入口，不含任何数据请求。
 */
import { computed } from 'vue'
import { tokenStore } from '@/api/client'

const loggedIn = computed(() => !!tokenStore.get())

const features = [
	{ k: '01', title: '简历定制出题', desc: '解析简历与目标方向，结合题库生成贴合你经历的题目，而不是抽题库。' },
	{ k: '02', title: '逐题评分与追问', desc: '每题给出分数、缺失点与追问；答得越深入，追问越具体。' },
	{ k: '03', title: '五维能力报告', desc: '逻辑 / 表达 / 深度 / 匹配 / 结构，配逐题复盘与改进建议。' },
]
</script>

<template>
	<div class="min-h-screen bg-paper">
		<header class="mx-auto flex max-w-[1080px] items-center justify-between px-8 py-7">
			<div>
				<div class="font-display text-[19px] leading-none text-ink">斑马</div>
				<div class="mono-label mt-2">云面试 / BANMA</div>
			</div>
			<RouterLink :to="loggedIn ? '/interview' : '/login'" class="btn-ghost text-[13px] no-underline">
				{{ loggedIn ? '进入面试' : '登录 / 注册' }}
			</RouterLink>
		</header>

		<section class="mx-auto max-w-[1080px] px-8 pt-16 pb-24">
			<div class="mono-label">AI INTERVIEW PRACTICE</div>
			<h1 class="mt-4 max-w-[16ch] text-[52px] leading-[1.25]">
				把每一次面试<br />都练在<em class="not-italic underline decoration-1 underline-offset-8">真实</em>之前
			</h1>
			<p class="mt-6 max-w-[46ch] text-[16px] leading-[1.9] text-muted">
				上传一份简历，AI 面试官据此出题、逐题评分并追问，最后给出一份可复盘的能力报告。
			</p>
			<div class="mt-10 flex items-center gap-4">
				<RouterLink to="/interview" class="btn-primary text-[15px] no-underline">开始一次模拟面试</RouterLink>
				<span class="mono-label">无需背题库 · 约 15 分钟 · 一份简历</span>
			</div>
		</section>

		<section class="border-t border-rule">
			<div class="mx-auto grid max-w-[1080px] gap-px bg-rule px-8 py-0 md:grid-cols-3">
				<article v-for="f in features" :key="f.k" class="bg-paper px-7 py-10">
					<div class="font-mono text-[11px] text-muted">{{ f.k }}</div>
					<h2 class="mt-3 text-[18px]">{{ f.title }}</h2>
					<p class="mt-3 text-[13px] leading-[1.9] text-muted">{{ f.desc }}</p>
				</article>
			</div>
		</section>

		<footer class="mx-auto max-w-[1080px] px-8 py-10">
			<div class="mono-label">斑马云面试 · 本地练习用 · 不构成任何就业建议</div>
		</footer>
	</div>
</template>
