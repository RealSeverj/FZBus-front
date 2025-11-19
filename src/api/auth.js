// 认证与用户相关接口封装
import request from './axios-config';

// 登录：POST /users/login
export function loginApi(data) {
	return request({
		url: '/users/login',
		method: 'post',
		data,
	});
}

// 创建用户：POST /users/
// 仅管理员可用，data: { username, password, is_admin }
export function createUserApi(data) {
	return request({
		url: '/users/',
		method: 'post',
		data,
	});
}

