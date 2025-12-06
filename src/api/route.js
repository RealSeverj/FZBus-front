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
// params: { include_vehicles, include_busstops, include_polyline }
export function fetchRouteDetail(id, params = {}) {
	return request({
		url: `/routes/${id}`,
		method: 'get',
		params: {
			include_vehicles: params.include_vehicles ?? true,
			include_busstops: params.include_busstops ?? true,
			include_polyline: params.include_polyline ?? false,
			...params,
		},
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

// ========== 线路-站点关联管理 ==========

// 获取线路的站点列表（按顺序排列）
export function fetchRouteBusstops(routeId) {
	return request({
		url: `/routes/${routeId}/busstops`,
		method: 'get',
	});
}

// 设置线路的站点列表
// data: { busstops: [{ amap_id, name, location, sequence }, ...] }
export function setRouteBusstops(routeId, data) {
	return request({
		url: `/routes/${routeId}/busstops`,
		method: 'post',
		data,
	});
}

// 清除线路的所有站点关联
export function clearRouteBusstops(routeId) {
	return request({
		url: `/routes/${routeId}/busstops`,
		method: 'delete',
	});
}

// 通过高德ID获取线路详情
export function fetchRouteByAmapId(amapId, params) {
	return request({
		url: `/routes/by-amap-id/${amapId}`,
		method: 'get',
		params,
	});
}
