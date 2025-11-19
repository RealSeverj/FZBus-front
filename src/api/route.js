// 线路相关接口封装
import request from './axios-config';

// 获取线路列表，可选根据 active 筛选
export function fetchRoutes(params) {
	return request({
		url: '/routes/',
		method: 'get',
		params,
	});
}

// 获取线路详情
export function fetchRouteDetail(id) {
	return request({
		url: `/routes/${id}`,
		method: 'get',
	});
}

// 创建线路
export function createRoute(data) {
	return request({
		url: '/routes/',
		method: 'post',
		data,
	});
}

// 更新线路
export function updateRoute(id, data) {
	return request({
		url: `/routes/${id}`,
		method: 'put',
		data,
	});
}

// 删除线路
export function deleteRoute(id) {
	return request({
		url: `/routes/${id}`,
		method: 'delete',
	});
}

