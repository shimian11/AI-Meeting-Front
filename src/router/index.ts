import { createRouter, createWebHistory } from 'vue-router'
import { tokenStore } from '@/api/client'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{ path: '/', component: () => import('@/views/MarketingHomeView.vue') },
		{ path: '/login', component: () => import('@/views/LoginView.vue') },
		{
			// 登录后的页面统一套 AppLayout（侧栏 + 内容区）
			path: '/',
			component: () => import('@/layouts/AppLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{ path: 'interview', component: () => import('@/views/InterviewIntroView.vue') },
				{ path: 'interview/:sessionId', component: () => import('@/views/InterviewRoomView.vue') },
				{ path: 'interview/report', component: () => import('@/views/ReportListView.vue') },
				{ path: 'interview/report/:sessionId', component: () => import('@/views/ReportDetailView.vue') },
				{ path: 'profile', component: () => import('@/views/ProfileView.vue') },
				{ path: 'chat', component: () => import('@/views/ChatView.vue') },
			],
		},
	],
})

/** 全局守卫：无 token 一律踢回 /login */
router.beforeEach((to) => {
	if (to.matched.some((r) => r.meta.requiresAuth) && !tokenStore.get()) {
		return { path: '/login', query: { redirect: to.fullPath } }
	}
})

export default router
