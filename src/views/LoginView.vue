<script setup lang="ts">
	/** 登录页：极简表单；视觉基线见 docs/front/prototype */
	import { ref } from 'vue'
	import { useRouter } from 'vue-router'
	import { ElMessage } from 'element-plus'
	import { login, register } from '@/api/auth'
	import { tokenStore } from '@/api/client'
	
	const router = useRouter()
	const form = ref({ username: '', password: ''})
	const loading = ref(false)
	
	//处理登陆/注册提交
	async function onSubmit(isRegister: boolean) {
		if (!form.value.username || !form.value.password) {
			ElMessage.warning('请输入用户名和密码')
			return
		}
		loading.value = true
		try{
			if(isRegister) {
				await register(form.value.username, form.value.password)
				ElMessage.success('注册成功，已自动登陆')
			}
			const res = await login(form.value.username, form.value.password)
			tokenStore.set(res.token)
			await router.push('/interview')
		} catch {
			/* 错误已在拦截器里弹过提示 */
		} finally{
			loading.value = false
		}
	}
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
	    <el-card class="w-90">
	      <h1 class="mb-6 text-center text-xl font-semibold">斑马云面试</h1>
	      <el-form label-position="top">
	        <el-form-item label="用户名">
	          <el-input v-model="form.username" placeholder="用户名" data-test="username" />
	        </el-form-item>
	        <el-form-item label="密码">
	          <el-input
	            v-model="form.password"
	            type="password"
	            show-password
	            placeholder="密码"
	            data-test="password"
	            @keyup.enter="onSubmit(false)"
	          />
	        </el-form-item>
	        <div class="mt-4 flex gap-3">
	          <el-button type="primary" class="flex-1" :loading="loading" data-test="btn-login" @click="onSubmit(false)">
	            登录
	          </el-button>
	          <el-button class="flex-1" :loading="loading" data-test="btn-register" @click="onSubmit(true)">
	            注册并登录
	          </el-button>
	        </div>
	      </el-form>
	    </el-card>
	  </div>
</template>