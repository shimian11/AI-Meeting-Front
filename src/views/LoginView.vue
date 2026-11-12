<script setup lang="ts">
/**
 * 登录 / 注册页（邮箱体系）
 *
 * 页面职责：
 *   1. 登录模式：邮箱 + 密码
 *   2. 注册模式：邮箱 + 密码 + 验证码（60 秒倒计时）
 *   3. 登录成功后落地 token 并跳转面试介绍页
 *
 * 状态机：mode = 'login' | 'register'
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { login, register, sendMailCode } from '@/api/auth'
import { tokenStore } from '@/api/client'

const router = useRouter()

/** 当前模式 */
const mode = ref<'login' | 'register'>('login')
/** 提交中 */
const loading = ref(false)
/** 发码中 */
const sendingCode = ref(false)
/** 倒计时剩余秒数（0 = 可发送） */
const countdown = ref(0)
/** 表单引用，用于触发校验 */
const formRef = ref<FormInstance>()

/** 表单数据 */
const form = ref({
  email: '',
  password: '',
  mailCode: '',
})

/** 校验规则：邮箱用 Element Plus 内置 type: 'email'，不手写正则 */
const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  mailCode:
    mode.value === 'register'
      ? [{ required: true, message: '请输入验证码', trigger: 'blur' }]
      : [],
}))

/** 倒计时定时器句柄 */
let timer: ReturnType<typeof setInterval> | null = null

/** 清理定时器（组件卸载时必须做，否则内存泄漏） */
function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * 发送验证码
 *
 * 步骤：
 *   1. 先校验邮箱字段（不合法不发请求）
 *   2. 调后端发码，成功启动 60 秒倒计时
 *   3. 失败由拦截器统一提示，不启动倒计时
 */
async function onSendCode() {
  if (!form.value.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  // 只校验邮箱字段
  try {
    await formRef.value?.validateField('email')
  } catch {
    return
  }

  sendingCode.value = true
  try {
    await sendMailCode(form.value.email)
    ElMessage.success('验证码已发送，请查收邮件')
    startCountdown()
  } catch {
    /* 错误提示已由 axios 拦截器弹出 */
  } finally {
    sendingCode.value = false
  }
}

/** 启动 60 秒倒计时（与后端 sendIntervalSeconds 保持一致） */
function startCountdown() {
  countdown.value = 60
  clearTimer()
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
    }
  }, 1000)
}

/**
 * 提交（登录或注册）
 *
 * 步骤：
 *   1. 表单整体校验
 *   2. 按模式调对应接口
 *   3. 登录成功存 token → 跳面试介绍页
 */
async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    if (mode.value === 'register') {
      await register({
        password: form.value.password,
        mail: form.value.email,
        mailCode: form.value.mailCode,
      })
      ElMessage.success('注册成功，正在登录')
    }
    // 注册成功后直接登录（省一次手动操作）
    const res = await login(form.value.email, form.value.password)
    tokenStore.set(res.token)
    await router.push('/interview')
  } catch {
    /* 错误提示已由拦截器弹出 */
  } finally {
    loading.value = false
  }
}

/** 切换登录/注册模式：清空验证码与倒计时 */
function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  form.value.mailCode = ''
  countdown.value = 0
  clearTimer()
  formRef.value?.clearValidate()
}

// 组件卸载清理定时器
onBeforeUnmount(clearTimer)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <el-card class="w-full max-w-md shadow-sm">
      <!-- 标题区：模式不同文案不同 -->
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold text-gray-800">斑马云面试</h1>
        <p class="mt-2 text-sm text-gray-500">
          {{ mode === 'login' ? '登录以继续你的面试练习' : '使用邮箱注册新账号' }}
        </p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <!-- 邮箱 -->
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="your@qq.com"
            clearable
            data-test="email"
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="至少 6 位"
            data-test="password"
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <!-- 验证码：仅注册模式显示 -->
        <el-form-item v-if="mode === 'register'" label="验证码" prop="mailCode">
          <div class="flex w-full gap-2">
            <el-input
              v-model="form.mailCode"
              placeholder="6 位数字"
              maxlength="6"
              class="flex-1"
              data-test="mail-code"
              @keyup.enter="onSubmit"
            />
            <!-- 倒计时中禁用；countdown > 0 时展示剩余秒数 -->
            <el-button
              class="w-32 shrink-0"
              :disabled="countdown > 0"
              :loading="sendingCode"
              data-test="btn-send-code"
              @click="onSendCode"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 主按钮 -->
        <el-button
          type="primary"
          size="large"
          class="mt-2 w-full"
          :loading="loading"
          data-test="btn-submit"
          @click="onSubmit"
        >
          {{ mode === 'login' ? '登录' : '注册' }}
        </el-button>

        <!-- 模式切换 -->
        <div class="mt-4 text-center text-sm text-gray-500">
          <span>{{ mode === 'login' ? '还没有账号？' : '已有账号？' }}</span>
          <el-button link type="primary" data-test="btn-switch" @click="switchMode">
            {{ mode === 'login' ? '注册' : '去登录' }}
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>