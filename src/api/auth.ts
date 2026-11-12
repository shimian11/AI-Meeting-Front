/**
 * 认证接口：对齐 Java UserController（/api/banma/v1/users/*）
 * 泛型只有一个 —— client.ts 的 UnwrappedInstance 已声明"拦截器解包过"，
 * 所以这里的类型直接是业务数据，不是 AxiosResponse。
 */
import { api } from './client'

/** 登录响应（对齐 UserController.login 的 Map 返回） */
export interface LoginResult {
  token: string
  username: string
  isAdmin: boolean
}

/** 注册参数（username 由后端写成邮箱，前端只需传 mail + mailCode） */
export interface RegisterParams {
	password: string
	mail: string
	mailCode: string
}

/**
 * 账号密码登录
 * @param username 用户名
 * @param password 密码
 * @returns token + 用户名 + 是否管理员
 */
export function login(username: string, password: string) {
  return api.post<LoginResult>('/users/login', { username, password })
}

/**
 * 发送邮箱验证码
 * 60 秒间隔与日 10 封上限由后端把守，前端倒计时只是体验层
 */
export function sendMailCode(email:string){
	return api.post<void>('/users/mail-code', { email, scene: 'register'})
}

/**
 * 注册（邮箱 + 密码 + 验证码）
 */
export function register(params: RegisterParams) {
  return api.post<void>('/users/register', params)
}