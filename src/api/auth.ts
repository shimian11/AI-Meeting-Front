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
 * 注册账号（后端注册接口不返回数据，故泛型为 void）
 */
export function register(username: string, password: string) {
  return api.post<void>('/users/register', { username, password })
}
