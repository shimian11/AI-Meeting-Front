/** 认证接口：对齐 UserController（/api/banma/v1/users/*） */
import { api } from './client'

export interface LoginResult{
	token: string
	username: string
	isAdmin: boolean
}

export function login(username: string, password: string){
	return api.post<never, LoginResult>('/users/login', {username, password})
}

export function register(username: string, password: string){
	return api.post<never, void>('/users/register', {username, password})
}