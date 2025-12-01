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
