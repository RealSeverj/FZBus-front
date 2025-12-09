<template>
	<div class="running-vehicle-map">
		<!-- 标题栏 -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<el-icon class="text-primary text-xl"><Location /></el-icon>
				<h3 class="text-lg font-semibold">实时车辆监控</h3>
				<el-tag type="success" size="small">{{ runningVehicles.length }} 辆运行中</el-tag>
			</div>
			<div class="flex items-center gap-2">
				<el-button size="small" :loading="loading" @click="loadRunningVehicles">
					<el-icon class="mr-1"><Refresh /></el-icon>
					刷新
				</el-button>
				<span class="text-xs text-gray-400">
					更新于 {{ lastUpdateTime }}
				</span>
			</div>
		</div>

		<!-- 地图和车辆列表 -->
		<div class="flex gap-4 map-wrapper" :class="{ 'is-fullscreen': isFullscreen }">
			<!-- 地图区域 -->
			<div class="flex-1 relative">
				<div ref="mapContainer" class="w-full h-full rounded-lg border"></div>
				<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
					<el-icon class="is-loading text-2xl text-primary"><Loading /></el-icon>
					<span class="ml-2 text-gray-500">加载中...</span>
				</div>
				<!-- 全屏按钮（放在卡片/地图内部右上角） -->
				<button
					class="fullscreen-toggle"
					type="button"
					@click="toggleFullscreen"
				>
					{{ isFullscreen ? '退出全屏' : '全屏' }}
				</button>
				<!-- 图例 -->
				<div class="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md text-xs">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full bg-orange-500"></div>
						<span>车辆当前位置</span>
					</div>
				</div>
			</div>

			<!-- 车辆列表 -->
			<div class="w-72 flex flex-col">
				<div class="flex items-center justify-between mb-2">
					<h4 class="font-bold text-gray-700">
						<el-icon class="mr-1"><Van /></el-icon>
						运行中车辆
					</h4>
				</div>
				<div class="flex-1 overflow-auto border rounded-lg">
					<div
						v-for="vehicle in runningVehicles"
						:key="vehicle.schedule.id"
						class="px-3 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
						:class="{ 'bg-blue-100': selectedVehicleId === vehicle.schedule.id }"
						@click="handleVehicleClick(vehicle)"
					>
						<div class="flex items-center justify-between mb-1">
							<span class="font-semibold text-primary">{{ vehicle.vehicle?.plate_number || '未知车牌' }}</span>
							<div class="flex items-center gap-1">
								<el-tag size="small" :type="vehicle.schedule.direction === 'up' ? 'primary' : 'success'">
									{{ vehicle.schedule.direction === 'up' ? '上行' : '下行' }}
								</el-tag>
								<el-tag size="small" type="warning">运行中</el-tag>
							</div>
						</div>
						<div class="text-xs text-gray-500 space-y-1">
							<div class="flex items-center gap-1">
								<el-icon><Guide /></el-icon>
								<span>{{ vehicle.route?.code }} {{ vehicle.route?.name }}</span>
							</div>
							<div class="flex items-center gap-1 text-gray-400">
								<span>起点: {{ getOriginByDirection(vehicle) }}</span>
								<span>→</span>
								<span>终点: {{ getDestinationByDirection(vehicle) }}</span>
							</div>
							<div class="flex items-center gap-1">
								<el-icon><User /></el-icon>
								<span>{{ vehicle.employee?.name || '未知司机' }}</span>
							</div>
							<div class="flex items-center gap-1">
								<el-icon><Clock /></el-icon>
								<span>发车: {{ formatTime(vehicle.schedule.departure_time) }}</span>
							</div>
							<div class="flex items-center gap-1 text-orange-500">
								<el-icon><Timer /></el-icon>
								<span>预计到达终点: {{ vehicle.estimatedArrival }}</span>
							</div>
							<div class="flex items-center gap-1 text-blue-500">
								<el-icon><LocationFilled /></el-icon>
								<span>当前站: {{ vehicle.currentStop?.name || '未知' }}</span>
							</div>
						</div>
					</div>
					<div v-if="runningVehicles.length === 0 && !loading" class="text-center text-gray-400 py-8">
						<el-icon class="text-4xl mb-2"><Van /></el-icon>
						<p>当前没有运行中的车辆</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
	Location,
	Refresh,
	Loading,
	Van,
	Guide,
	User,
	Clock,
	Timer,
	LocationFilled,
} from '@element-plus/icons-vue';
/* 使用高德 JS API 替代 Leaflet */
import AMapLoader from '@amap/amap-jsapi-loader';
import { fetchSchedules } from '@/api/schedule';
import { fetchRouteDetail } from '@/api/route';

// 平均速度 30km/h = 30000m/h = 500m/min = 8.33m/s
const AVERAGE_SPEED_MS = 30000 / 3600; // 8.33 m/s

// 地图相关（高德地图）
const mapContainer = ref(null);
let map = null;
let AMap = null;
let vehicleMarkers = new Map();
let routePolylines = [];

// 数据
const runningVehicles = ref([]);
const loading = ref(false);
const lastUpdateTime = ref('-');
const selectedVehicleId = ref(null);

// 全屏
const isFullscreen = ref(false);

// 自动刷新定时器
let refreshTimer = null;

// 创建车辆图标（高德使用自定义内容标记）
const createVehicleMarker = (position, isSelected = false) => {
	if (!AMap || !map || !position) return null;
	const content = `
		<div style="
			background-color: #F97316;
			width: ${isSelected ? 40 : 32}px;
			height: ${isSelected ? 40 : 32}px;
			border-radius: 50%;
			border: 3px solid white;
			box-shadow: 0 2px 8px rgba(0,0,0,0.4);
			display: flex;
			align-items: center;
			justify-content: center;
			${isSelected ? 'animation: pulse 1.5s infinite;' : ''}
		">
			<svg xmlns="http://www.w3.org/2000/svg" width="${(isSelected ? 40 : 32) - 12}" height="${(isSelected ? 40 : 32) - 12}" viewBox="0 0 24 24" fill="white">
				<path d="M17 5H3a2 2 0 0 0-2 2v9h2c0 1.65 1.34 3 3 3s3-1.35 3-3h5.5c0 1.65 1.34 3 3 3s3-1.35 3-3H23v-5l-3-4h-3V5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM21 13h-6V8h3l3 4v1z"/>
			</svg>
		</div>`;
	return new AMap.Marker({
		position: [position.lng, position.lat],
		content,
		offset: new AMap.Pixel((isSelected ? 40 : 32) / -2, (isSelected ? 40 : 32) / -2),
		zIndex: 1000,
	});
};

// 解析 polyline 字符串为坐标数组（返回 [lat, lng]）
const parsePolyline = (polylineStr) => {
	if (!polylineStr) return [];
	const points = polylineStr.split(';').map((point) => {
		const [lng, lat] = point.split(',').map(Number);
		if (!isNaN(lng) && !isNaN(lat)) {
			return [lat, lng];
		}
		return null;
	}).filter(Boolean);
	return points;
};

// 将站点的 location 字符串解析为 latitude/longitude 字段
const normalizeBusstops = (busstops) => {
	if (!Array.isArray(busstops)) return [];
	return busstops.map((stop) => {
		if (stop && !stop.latitude && !stop.longitude && typeof stop.location === 'string') {
			const [lngStr, latStr] = stop.location.split(',');
			const lng = Number(lngStr);
			const lat = Number(latStr);
			if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
				return {
					...stop,
					longitude: lng,
					latitude: lat,
				};
			}
		}
		return stop;
	});
};

// 计算两点之间的距离（米）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
	const R = 6371000; // 地球半径（米）
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

// 计算路径上的累计距离
const calculatePathDistances = (pathPoints) => {
	const distances = [0];
	for (let i = 1; i < pathPoints.length; i++) {
		const dist = calculateDistance(
			pathPoints[i - 1][0], pathPoints[i - 1][1],
			pathPoints[i][0], pathPoints[i][1]
		);
		distances.push(distances[i - 1] + dist);
	}
	return distances;
};

// 根据已行驶距离计算位置
const getPositionOnPath = (pathPoints, traveledDistance) => {
	if (pathPoints.length === 0) return null;
	if (pathPoints.length === 1) return { lat: pathPoints[0][0], lng: pathPoints[0][1] };

	const distances = calculatePathDistances(pathPoints);
	const totalDistance = distances[distances.length - 1];

	if (traveledDistance >= totalDistance) {
		const lastPoint = pathPoints[pathPoints.length - 1];
		return { lat: lastPoint[0], lng: lastPoint[1] };
	}

	// 找到当前所在的路段
	for (let i = 1; i < distances.length; i++) {
		if (traveledDistance <= distances[i]) {
			const segmentStart = pathPoints[i - 1];
			const segmentEnd = pathPoints[i];
			const segmentDistance = distances[i] - distances[i - 1];
			const ratio = (traveledDistance - distances[i - 1]) / segmentDistance;

			return {
				lat: segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * ratio,
				lng: segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * ratio,
			};
		}
	}

	return { lat: pathPoints[0][0], lng: pathPoints[0][1] };
};

// 计算当前站（离车辆最近的站点）
const getCurrentStop = (busstops, currentPosition) => {
	if (!busstops || busstops.length === 0 || !currentPosition) return null;

	// 找到距离当前位置最近的站点
	let minDistance = Infinity;
	let nearestIndex = 0;

	busstops.forEach((stop, index) => {
		if (stop.latitude && stop.longitude) {
			const dist = calculateDistance(
				currentPosition.lat, currentPosition.lng,
				stop.latitude, stop.longitude
			);
			if (dist < minDistance) {
				minDistance = dist;
				nearestIndex = index;
			}
		}
	});

	return { stop: busstops[nearestIndex], index: nearestIndex, distance: minDistance };
};

// 格式化时间
const formatTime = (isoString) => {
	if (!isoString) return '-';
	const date = new Date(isoString);
	return date.toLocaleTimeString('zh-CN', {
		hour: '2-digit',
		minute: '2-digit',
	});
};

// 格式化预计到达时间
const formatEstimatedArrival = (arrivalDate) => {
	if (!arrivalDate) return '-';
	return arrivalDate.toLocaleTimeString('zh-CN', {
		hour: '2-digit',
		minute: '2-digit',
	});
};

// 根据方向获取起点（模板用）
const getOriginByDirection = (vehicle) => {
	const route = vehicle.route;
	if (!route) return '未知';
	const direction = vehicle.schedule?.direction || 'up';
	return direction === 'up' ? (route.origin || '未知') : (route.destination || '未知');
};

// 根据方向获取终点（模板用）
const getDestinationByDirection = (vehicle) => {
	const route = vehicle.route;
	if (!route) return '未知';
	const direction = vehicle.schedule?.direction || 'up';
	return direction === 'up' ? (route.destination || '未知') : (route.origin || '未知');
};

// 根据方向获取起点（纯函数，用于 InfoWindow）
const getOriginByDirectionRaw = (vehicle) => {
	const route = vehicle.route;
	if (!route) return '未知';
	const direction = vehicle.schedule?.direction || 'up';
	return direction === 'up' ? (route.origin || '未知') : (route.destination || '未知');
};

// 根据方向获取终点（纯函数，用于 InfoWindow）
const getDestinationByDirectionRaw = (vehicle) => {
	const route = vehicle.route;
	if (!route) return '未知';
	const direction = vehicle.schedule?.direction || 'up';
	return direction === 'up' ? (route.destination || '未知') : (route.origin || '未知');
};

// 初始化地图（高德）
const initMap = async () => {
	if (!mapContainer.value) return;
	if (map) return;

	AMap = await AMapLoader.load({
		key: import.meta.env.VITE_AMAP_KEY,
		version: '2.0',
		plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.ToolBar'],
	});

	// 福州中心
	map = new AMap.Map(mapContainer.value, {
		center: [119.3, 26.08],
		zoom: 12,
	});

	map.addControl(new AMap.ToolBar());
};

// 加载运行中的车辆
const loadRunningVehicles = async () => {
	loading.value = true;
	try {
		// 获取状态为 running 的排班
		const schedules = await fetchSchedules({
			status: 'running',
			include_details: true,
		});

		if (!Array.isArray(schedules) || schedules.length === 0) {
			runningVehicles.value = [];
			clearMap();
			return;
		}

		// 获取每个排班的线路详情（包含站点和路径）
		const vehiclesWithRoutes = await Promise.all(
			schedules.map(async (schedule) => {
				try {
					const routeDetail = await fetchRouteDetail(schedule.route_id, {
						include_vehicles: false,
						include_busstops: true,
						include_polyline: true,
					});

					// 规范化站点坐标（从 location 拆出经纬度）
					let normalizedBusstops = normalizeBusstops(routeDetail.busstops || []);

					// 解析路径
					let pathPoints = parsePolyline(routeDetail.polyline);

					// 如果是下行方向，反转路径和站点顺序
					const direction = schedule.direction || 'up';
					if (direction === 'down') {
						pathPoints = pathPoints.slice().reverse();
						normalizedBusstops = normalizedBusstops.slice().reverse();
					}

					// 计算车辆当前位置
					const departureTime = new Date(schedule.departure_time);
					const now = new Date();
					const elapsedSeconds = (now - departureTime) / 1000;
					const traveledDistance = elapsedSeconds * AVERAGE_SPEED_MS;

					const currentPosition = getPositionOnPath(pathPoints, traveledDistance);

					// 计算路线总长度
					const totalDistance = routeDetail.distance || 
						(pathPoints.length > 0 ? calculatePathDistances(pathPoints).pop() : 0);

					// 计算剩余距离和预计到达时间
					const remainingDistance = Math.max(0, totalDistance - traveledDistance);
					const remainingSeconds = remainingDistance / AVERAGE_SPEED_MS;
					const estimatedArrivalDate = new Date(now.getTime() + remainingSeconds * 1000);

					// 获取当前站（最近的站点）
					const currentStopInfo = getCurrentStop(normalizedBusstops, currentPosition);

					return {
						schedule,
						vehicle: schedule.vehicle,
						employee: schedule.employee,
						route: routeDetail,
						busstops: normalizedBusstops,
						pathPoints,
						currentPosition,
						traveledDistance,
						totalDistance,
						remainingDistance,
						estimatedArrival: formatEstimatedArrival(estimatedArrivalDate),
						currentStop: currentStopInfo?.stop,
						currentStopIndex: currentStopInfo?.index,
					};
				} catch (error) {
					console.error(`获取线路 ${schedule.route_id} 详情失败:`, error);
					return {
						schedule,
						vehicle: schedule.vehicle,
						employee: schedule.employee,
						route: schedule.route,
						busstops: [],
						pathPoints: [],
						currentPosition: null,
						estimatedArrival: '-',
						currentStop: null,
					};
				}
			})
		);

		runningVehicles.value = vehiclesWithRoutes;
		lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');

		// 更新地图
		updateMap();
	} catch (error) {
		console.error('加载运行中车辆失败:', error);
	} finally {
		loading.value = false;
	}
};

// 清除地图上的标记
const clearMap = () => {
	if (!AMap || !map) return;
	// 清除旧的车辆
	vehicleMarkers.forEach((marker) => {
		map.remove(marker);
	});
	vehicleMarkers.clear();
	// 清除旧线路
	if (routePolylines.length) {
		map.remove(routePolylines);
		routePolylines = [];
	}
};

// 更新地图显示
const updateMap = () => {
	if (!map || !AMap) return;

	clearMap();
	const overlaysForView = [];

	runningVehicles.value.forEach((vehicle) => {
		const { currentPosition, pathPoints, busstops, currentStopIndex, schedule } = vehicle;

		// 绘制线路
		if (pathPoints.length > 1) {
			const pathLngLat = pathPoints.map((p) => [p[1], p[0]]); // [lng, lat]
			const polyline = new AMap.Polyline({
				path: pathLngLat,
				strokeColor: '#409EFF',
				strokeWeight: 4,
				strokeOpacity: 0.6,
			});
			routePolylines.push(polyline);
			map.add(polyline);
			overlaysForView.push(polyline);
		}

		// 车辆
		if (currentPosition) {
			const isSelected = selectedVehicleId.value === schedule.id;
			const marker = createVehicleMarker(currentPosition, isSelected);
			if (marker) {
				const contentHtml = `
					<div style="min-width: 180px;">
						<h4 style="margin: 0 0 8px 0; font-weight: bold; color: #F97316;">
							${vehicle.vehicle?.plate_number || '未知车牌'}
						</h4>
						<p style="margin: 4px 0; font-size: 12px;">
							<strong>线路:</strong> ${vehicle.route?.code} ${vehicle.route?.name}
							<span style="margin-left: 8px; padding: 2px 6px; border-radius: 4px; font-size: 10px; background: ${schedule.direction === 'up' ? '#409EFF' : '#67C23A'}; color: white;">
								${schedule.direction === 'up' ? '上行' : '下行'}
							</span>
						</p>
						<p style="margin: 4px 0; font-size: 12px; color: #888;">
							<strong>起点:</strong> ${getOriginByDirectionRaw(vehicle)} → <strong>终点:</strong> ${getDestinationByDirectionRaw(vehicle)}
						</p>
						<p style="margin: 4px 0; font-size: 12px;">
							<strong>司机:</strong> ${vehicle.employee?.name || '未知'}
						</p>
						<p style="margin: 4px 0; font-size: 12px;">
							<strong>发车时间:</strong> ${formatTime(schedule.departure_time)}
						</p>
						<p style="margin: 4px 0; font-size: 12px; color: #F97316;">
							<strong>预计到达终点:</strong> ${vehicle.estimatedArrival}
						</p>
						<p style="margin: 4px 0; font-size: 12px; color: #3B82F6;">
							<strong>当前站:</strong> ${vehicle.currentStop?.name || '未知'}
						</p>
					</div>`;
				marker.setExtData({ scheduleId: schedule.id });
				marker.on('click', () => {
					const info = new AMap.InfoWindow({
						content: contentHtml,
						offset: new AMap.Pixel(0, -20),
					});
					info.open(map, marker.getPosition());
				});
				vehicleMarkers.set(schedule.id, marker);
				map.add(marker);
				overlaysForView.push(marker);
			}
		}
	});

	if (overlaysForView.length > 0) {
		map.setFitView(overlaysForView, true, [30, 30, 30, 30]);
	}
};

// 处理车辆点击
const handleVehicleClick = (vehicle) => {
	selectedVehicleId.value = vehicle.schedule.id;

// 更新标记样式并聚焦
	if (vehicle.currentPosition && map && AMap) {
		map.setZoomAndCenter(15, [vehicle.currentPosition.lng, vehicle.currentPosition.lat]);
	}
	// 重新绘制以更新选中样式
	updateMap();
};

// 切换全屏
const toggleFullscreen = () => {
	isFullscreen.value = !isFullscreen.value;
	// 进入/退出全屏后，让地图自适应容器
	nextTick(() => {
		if (map && AMap) {
			map.resize();
		}
	});
};

// 组件挂载
onMounted(() => {
	nextTick(async () => {
		await initMap();
		await loadRunningVehicles();

		// 每30秒自动刷新
		refreshTimer = setInterval(() => {
			loadRunningVehicles();
		}, 30000);
	});
});

// 组件卸载
onBeforeUnmount(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
	if (map) {
		map.destroy();
		map = null;
	}
});
</script>

<style scoped>
.running-vehicle-map {
	width: 100%;
}

.map-wrapper {
	height: 400px;
	position: relative;
}

.map-wrapper.is-fullscreen {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	margin: 0;
	padding: 16px;
	background: rgba(255, 255, 255);
	z-index: 2000;
	box-sizing: border-box;
}

.map-wrapper.is-fullscreen > div:first-child {
	background: #fff;
	border-radius: 12px;
}

.fullscreen-toggle {
	position: absolute;
	right: 16px;
	top: 16px;
	padding: 4px 10px;
	border-radius: 999px;
	border: none;
	background: rgba(15, 23, 42, 0.8);
	color: #fff;
	font-size: 12px;
	cursor: pointer;
	z-index: 2100;
}

.fullscreen-toggle:hover {
	background: rgba(15, 23, 42, 0.95);
}

/* 车辆列表滚动条样式 */
.overflow-auto::-webkit-scrollbar {
	width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
	background: #f1f1f1;
	border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb {
	background: #c1c1c1;
	border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
	background: #a1a1a1;
}

/* 脉冲动画 */
@keyframes pulse {
	0% {
		box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
	}
	70% {
		box-shadow: 0 0 0 15px rgba(249, 115, 22, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
	}
}
</style>
