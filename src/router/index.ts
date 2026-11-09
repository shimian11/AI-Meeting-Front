import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { tokenStore } from '@/api/client'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
	  { path: '/', redirect: '/interview' },
	  { path: '/login', component: () => import('@/views/LoginView.vue') },
	  {
		  path: '/interview',
		  component: () => import('@/views/InterviewIntroView.vue'),
		  meta: { requiresAuth: true},
	  },
	  {
		  path: '/interview/:sessionId',
		  component: () => import('@/views/InterviewRoomView.vue'),
		  meta: { requiresAuth: true },
	  },
    ],
})

/** 全局守卫：无 token 一律踢回 /login */
router.beforeEach((to) => {
	if (to.meta.requiresAuth && !tokenStore.get()){
		return { path: '/login', query: {redirect: to.fullPath}}
	}
})

export default router