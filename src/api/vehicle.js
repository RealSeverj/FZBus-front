// 车辆相关接口封装
import request from './axios-config';

// 获取车辆列表，可选根据 in_service 筛选
// params: { in_service, unassigned, include_routes }
export function fetchVehicles(params) {
	return request({
		url: '/vehicles/',
		method: 'get',
		params,
	});
}

// 根据 ID 获取车辆详情
export function fetchVehicleDetail(id, includeRoutes = true) {
	return request({
		url: `/vehicles/${id}`,
		method: 'get',
		params: { include_routes: includeRoutes },
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

// ========== 车辆-线路关联管理 ==========

// 获取车辆分配的所有线路
export function fetchVehicleRoutes(vehicleId) {
	return request({
		url: `/vehicles/${vehicleId}/routes`,
		method: 'get',
	});
}

// 将车辆分配到线路
// data: { route_id } 或 { route_ids: [...] }
export function assignVehicleToRoutes(vehicleId, data) {
	return request({
		url: `/vehicles/${vehicleId}/routes`,
		method: 'post',
		data,
	});
}

// 将车辆从线路上移除
export function removeVehicleFromRoute(vehicleId, routeId) {
	return request({
		url: `/vehicles/${vehicleId}/routes/${routeId}`,
		method: 'delete',
	});
}

// ========== 车辆-排班查询 ==========

// 获取车辆的排班记录
// params: { status, date, start_date, end_date, include_details }
export function fetchVehicleSchedules(vehicleId, params) {
	return request({
		url: `/vehicles/${vehicleId}/schedules`,
		method: 'get',
		params,
	});
}
