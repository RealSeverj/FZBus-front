// 用户相关接口封装
import request from './axios-config';

// 获取用户列表（仅管理员）
// - 普通管理员: 只能查看普通用户列表
// - 超级管理员(admin): 可以查看所有用户
export function fetchUsers() {
	return request({
		url: '/users/',
		method: 'get',
	});
}

// 用户登录
export function login(data) {
	return request({
		url: '/users/login',
		method: 'post',
		data,
	});
}

// 创建用户（仅管理员）
// - 普通管理员: 只能创建普通用户
// - 超级管理员(admin): 可以创建任意用户
export function createUser(data) {
	return request({
		url: '/users/',
		method: 'post',
		data,
	});
}

// 更新用户（权限规则见后端接口说明）
export function updateUser(id, data) {
	return request({
		url: `/users/${id}`,
		method: 'put',
		data,
	});
}

// 删除用户（仅管理员）
// - 普通管理员: 只能删除普通用户
// - 超级管理员(admin): 可以删除任意用户（但不能删除自己）
export function deleteUser(id) {
	return request({
		url: `/users/${id}`,
		method: 'delete',
	});
}
