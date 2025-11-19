// 班次/调度相关接口封装
import request from './axios-config';

// 获取班次列表，可选根据 status 筛选
export function fetchSchedules(params) {
	return request({
		url: '/schedules/',
		method: 'get',
		params,
	});
}

// 获取班次详情
export function fetchScheduleDetail(id) {
	return request({
		url: `/schedules/${id}`,
		method: 'get',
	});
}

// 创建班次
export function createSchedule(data) {
	return request({
		url: '/schedules/',
		method: 'post',
		data,
	});
}

// 更新班次
export function updateSchedule(id, data) {
	return request({
		url: `/schedules/${id}`,
		method: 'put',
		data,
	});
}

// 删除班次
export function deleteSchedule(id) {
	return request({
		url: `/schedules/${id}`,
		method: 'delete',
	});
}

