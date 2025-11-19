// 车辆相关接口封装
import request from './axios-config';

// 获取车辆列表，可选根据 in_service 筛选
export function fetchVehicles(params) {
	return request({
		url: '/vehicles/',
		method: 'get',
		params,
	});
}

// 根据 ID 获取车辆详情
export function fetchVehicleDetail(id) {
	return request({
		url: `/vehicles/${id}`,
		method: 'get',
	});
}

// 创建车辆
export function createVehicle(data) {
	return request({
		url: '/vehicles/',
		method: 'post',
		data,
	});
}

// 更新车辆
export function updateVehicle(id, data) {
	return request({
		url: `/vehicles/${id}`,
		method: 'put',
		data,
	});
}

// 删除车辆
export function deleteVehicle(id) {
	return request({
		url: `/vehicles/${id}`,
		method: 'delete',
	});
}

