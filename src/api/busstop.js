// 公交站点相关接口封装
import request from './axios-config';

/**
 * 获取公交站点列表（支持分页和搜索）
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 关键词搜索站点名称
 * @param {boolean} params.include_routes - 是否包含经停线路信息
 * @param {number} params.page - 页码
 * @param {number} params.per_page - 每页数量
 * @param {string} params.sort_by - 排序字段 (id/name/amap_id)
 * @param {string} params.order - 排序方向 (asc/desc)
 */
export function fetchBusstops(params) {
	return request({
		url: '/busstops/',
		method: 'get',
		params,
	});
}

/**
 * 获取单个站点详情
 * @param {number} id - 站点ID
 * @param {boolean} includeRoutes - 是否包含经停线路
 */
export function fetchBusstopDetail(id, includeRoutes = true) {
	return request({
		url: `/busstops/${id}`,
		method: 'get',
		params: { include_routes: includeRoutes },
	});
}

/**
 * 通过高德ID获取站点详情
 * @param {string} amapId - 高德地图站点ID
 * @param {boolean} includeRoutes - 是否包含经停线路
 */
export function fetchBusstopByAmapId(amapId, includeRoutes = true) {
	return request({
		url: `/busstops/by-amap-id/${amapId}`,
		method: 'get',
		params: { include_routes: includeRoutes },
	});
}

/**
 * 创建公交站点
 * @param {Object} data - 站点数据
 * @param {string} data.amap_id - 高德地图站点ID
 * @param {string} data.name - 站点名称
 * @param {string} data.location - 经纬度坐标 "经度,纬度"
 * @param {number} data.longitude - 经度（可选，与location二选一）
 * @param {number} data.latitude - 纬度（可选，与location二选一）
 */
export function createBusstop(data) {
	return request({
		url: '/busstops/',
		method: 'post',
		data,
	});
}

/**
 * 批量创建公交站点
 * @param {Array} busstops - 站点数据数组
 */
export function batchCreateBusstops(busstops) {
	return request({
		url: '/busstops/batch',
		method: 'post',
		data: { busstops },
	});
}

/**
 * 更新站点信息
 * @param {number} id - 站点ID
 * @param {Object} data - 更新数据
 */
export function updateBusstop(id, data) {
	return request({
		url: `/busstops/${id}`,
		method: 'put',
		data,
	});
}

/**
 * 删除站点
 * @param {number} id - 站点ID
 */
export function deleteBusstop(id) {
	return request({
		url: `/busstops/${id}`,
		method: 'delete',
	});
}

/**
 * 获取经停该站点的所有线路
 * @param {number} busstopId - 站点ID
 */
export function fetchBusstopRoutes(busstopId) {
	return request({
		url: `/busstops/${busstopId}/routes`,
		method: 'get',
	});
}

/**
 * 搜索站点（支持模糊搜索）
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 返回数量限制
 */
export function searchBusstops(keyword, limit = 20) {
	return request({
		url: '/busstops/search',
		method: 'get',
		params: { q: keyword, limit },
	});
}

/**
 * 获取附近的公交站点
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @param {number} radius - 搜索半径（米）
 * @param {number} limit - 返回数量限制
 */
export function fetchNearbyBusstops(longitude, latitude, radius = 500, limit = 20) {
	return request({
		url: '/busstops/nearby',
		method: 'get',
		params: { longitude, latitude, radius, limit },
	});
}
