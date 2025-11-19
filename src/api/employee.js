// 员工相关接口封装
import request from './axios-config';

// 获取员工列表，可选根据 active 筛选
export function fetchEmployees(params) {
	return request({
		url: '/employees/',
		method: 'get',
		params,
	});
}

// 获取员工详情
export function fetchEmployeeDetail(id) {
	return request({
		url: `/employees/${id}`,
		method: 'get',
	});
}

// 创建员工
export function createEmployee(data) {
	return request({
		url: '/employees/',
		method: 'post',
		data,
	});
}

// 更新员工
export function updateEmployee(id, data) {
	return request({
		url: `/employees/${id}`,
		method: 'put',
		data,
	});
}

// 删除员工
export function deleteEmployee(id) {
	return request({
		url: `/employees/${id}`,
		method: 'delete',
	});
}

