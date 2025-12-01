// 线路相关接口封装
import request from './axios-config';

// 获取线路列表，可选根据 active 筛选
// params: { active, include_vehicles }
export function fetchRoutes(params) {
	return request({
		url: '/routes/',
		method: 'get',
		params,
	});
}

// 获取线路详情
export function fetchRouteDetail(id, includeVehicles = true) {
	return request({
		url: `/routes/${id}`,
		method: 'get',
		params: { include_vehicles: includeVehicles },
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

// ========== 线路-车辆关联管理 ==========

// 获取线路上的所有车辆
export function fetchRouteVehicles(routeId) {
	return request({
		url: `/routes/${routeId}/vehicles`,
		method: 'get',
	});
}

// 向线路添加车辆
// data: { vehicle_id } 或 { vehicle_ids: [...] }
export function addVehiclesToRoute(routeId, data) {
	return request({
		url: `/routes/${routeId}/vehicles`,
		method: 'post',
		data,
	});
}

// 从线路上移除车辆
export function removeVehicleFromRoute(routeId, vehicleId) {
	return request({
		url: `/routes/${routeId}/vehicles/${vehicleId}`,
		method: 'delete',
	});
}

// ========== 线路-排班查询 ==========

// 获取线路的排班记录
// params: { status, date, start_date, end_date, include_details }
export function fetchRouteSchedules(routeId, params) {
	return request({
		url: `/routes/${routeId}/schedules`,
		method: 'get',
		params,
	});
}
