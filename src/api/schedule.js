// 排班相关接口封装
import request from './axios-config';

// 获取排班列表
// params: { status, vehicle_id, employee_id, route_id, date, start_date, end_date, include_details }
export function fetchSchedules(params) {
	return request({
		url: '/schedules/',
		method: 'get',
		params,
	});
}

// 获取排班详情
export function fetchScheduleDetail(id, includeDetails = true) {
	return request({
		url: `/schedules/${id}`,
		method: 'get',
		params: { include_details: includeDetails },
	});
}

// 创建排班
export function createSchedule(data) {
	return request({
		url: '/schedules/',
		method: 'post',
		data,
	});
}

// 更新排班
export function updateSchedule(id, data) {
	return request({
		url: `/schedules/${id}`,
		method: 'put',
		data,
	});
}

// 删除排班
export function deleteSchedule(id) {
	return request({
		url: `/schedules/${id}`,
		method: 'delete',
	});
}

// 获取班次统计数据
// params: { date, start_date, end_date, route_id, vehicle_id, employee_id }
export function fetchScheduleStatistics(params) {
	return request({
		url: '/schedules/statistics',
		method: 'get',
		params,
	});
}
