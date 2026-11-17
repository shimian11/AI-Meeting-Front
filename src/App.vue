<script setup lang="ts">
/**
 * 根组件：只渲染路由出口。
 *
 * 全局骨架（侧栏 + 内容区）在 `layouts/AppLayout.vue`，由路由的嵌套结构决定谁套布局：
 *   - `/`、`/login`  → 公开页，不套布局
 *   - 其余页面       → 套 AppLayout（路由 meta.requiresAuth）
 */
import { RouterView } from 'vue-router'
</script>

<template>
	<RouterView />
</template>
