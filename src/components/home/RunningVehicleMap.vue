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
		<div class="flex gap-4" style="height: 400px;">
			<!-- 地图区域 -->
			<div class="flex-1 relative">
				<div ref="mapContainer" class="w-full h-full rounded-lg border"></div>
				<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
					<el-icon class="is-loading text-2xl text-primary"><Loading /></el-icon>
					<span class="ml-2 text-gray-500">加载中...</span>
				</div>
				<!-- 图例 -->
				<div class="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md text-xs">
					<div class="flex items-center gap-2 mb-1">
						<div class="w-3 h-3 rounded-full bg-orange-500"></div>
						<span>车辆当前位置</span>
					</div>
					<div class="flex items-center gap-2 mb-1">
						<div class="w-3 h-3 rounded-full bg-green-500"></div>
						<span>起点站</span>
					</div>
					<div class="flex items-center gap-2 mb-1">
						<div class="w-3 h-3 rounded-full bg-red-500"></div>
						<span>终点站</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
						<span>当前最近站点</span>
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
							<el-tag size="small" type="warning">运行中</el-tag>
						</div>
						<div class="text-xs text-gray-500 space-y-1">
							<div class="flex items-center gap-1">
								<el-icon><Guide /></el-icon>
								<span>{{ vehicle.route?.code }} {{ vehicle.route?.name }}</span>
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
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchSchedules } from '@/api/schedule';
import { fetchRouteDetail } from '@/api/route';

// 平均速度 30km/h = 30000m/h = 500m/min = 8.33m/s
const AVERAGE_SPEED_MS = 30000 / 3600; // 8.33 m/s

// 地图相关
const mapContainer = ref(null);
let map = null;
let markersLayer = null;
let polylinesLayer = null;
let vehicleMarkers = new Map();

// 数据
const runningVehicles = ref([]);
const loading = ref(false);
const lastUpdateTime = ref('-');
const selectedVehicleId = ref(null);

// 自动刷新定时器
let refreshTimer = null;

// 修复 Leaflet 默认图标问题
const fixLeafletIcons = () => {
	delete L.Icon.Default.prototype._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
		iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
		shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
	});
};

// 创建车辆图标
const createVehicleIcon = (isSelected = false) => {
	const size = isSelected ? 40 : 32;
	return L.divIcon({
		className: 'vehicle-marker',
		html: `<div style="
			background-color: #F97316;
			width: ${size}px;
			height: ${size}px;
			border-radius: 50%;
			border: 3px solid white;
			box-shadow: 0 2px 8px rgba(0,0,0,0.4);
			display: flex;
			align-items: center;
			justify-content: center;
			${isSelected ? 'animation: pulse 1.5s infinite;' : ''}
		">
			<svg xmlns="http://www.w3.org/2000/svg" width="${size - 12}" height="${size - 12}" viewBox="0 0 24 24" fill="white">
				<path d="M17 5H3a2 2 0 0 0-2 2v9h2c0 1.65 1.34 3 3 3s3-1.35 3-3h5.5c0 1.65 1.34 3 3 3s3-1.35 3-3H23v-5l-3-4h-3V5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM21 13h-6V8h3l3 4v1z"/>
			</svg>
		</div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
		popupAnchor: [0, -size / 2],
	});
};

// 创建站点图标
const createStopIcon = (type, index = 0) => {
	let bgColor = '#3B82F6'; // 普通站点: 蓝色
	if (type === 'start') bgColor = '#22C55E'; // 起点: 绿色
	else if (type === 'end') bgColor = '#EF4444'; // 终点: 红色
	else if (type === 'current') bgColor = '#EAB308'; // 当前站: 黄色

	const size = type === 'current' ? 28 : 24;

	return L.divIcon({
		className: 'bus-stop-marker',
		html: `<div style="
			background-color: ${bgColor};
			width: ${size}px;
			height: ${size}px;
			border-radius: 50%;
			border: 2px solid white;
			box-shadow: 0 2px 4px rgba(0,0,0,0.3);
			display: flex;
			align-items: center;
			justify-content: center;
			${type === 'current' ? 'animation: pulse 1.5s infinite;' : ''}
		">
			<span style="color: white; font-size: 10px; font-weight: bold;">${index + 1}</span>
		</div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
		popupAnchor: [0, -size / 2],
	});
};

// 解析 polyline 字符串为坐标数组
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

// 初始化地图
const initMap = () => {
	if (!mapContainer.value) return;

	fixLeafletIcons();

	// 福州市中心坐标
	const fuzhouCenter = [26.08, 119.3];

	map = L.map(mapContainer.value, {
		center: fuzhouCenter,
		zoom: 12,
		zoomControl: true,
	});

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		maxZoom: 19,
	}).addTo(map);

	markersLayer = L.layerGroup().addTo(map);
	polylinesLayer = L.layerGroup().addTo(map);
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

					// 计算车辆当前位置
					const departureTime = new Date(schedule.departure_time);
					const now = new Date();
					const elapsedSeconds = (now - departureTime) / 1000;
					const traveledDistance = elapsedSeconds * AVERAGE_SPEED_MS;

					// 解析路径
					const pathPoints = parsePolyline(routeDetail.polyline);
					const currentPosition = getPositionOnPath(pathPoints, traveledDistance);

					// 计算路线总长度
					const totalDistance = routeDetail.distance || 
						(pathPoints.length > 0 ? calculatePathDistances(pathPoints).pop() : 0);

					// 计算剩余距离和预计到达时间
					const remainingDistance = Math.max(0, totalDistance - traveledDistance);
					const remainingSeconds = remainingDistance / AVERAGE_SPEED_MS;
					const estimatedArrivalDate = new Date(now.getTime() + remainingSeconds * 1000);

					// 获取当前站（最近的站点）
					const currentStopInfo = getCurrentStop(routeDetail.busstops || [], currentPosition);

					return {
						schedule,
						vehicle: schedule.vehicle,
						employee: schedule.employee,
						route: routeDetail,
						busstops: routeDetail.busstops || [],
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
	markersLayer?.clearLayers();
	polylinesLayer?.clearLayers();
	vehicleMarkers.clear();
};

// 更新地图显示
const updateMap = () => {
	if (!map) return;

	clearMap();

	const bounds = [];

	runningVehicles.value.forEach((vehicle) => {
		const { currentPosition, pathPoints, busstops, currentStopIndex, schedule } = vehicle;

		// 绘制线路路径
		if (pathPoints.length > 1) {
			const polyline = L.polyline(pathPoints, {
				color: '#409EFF',
				weight: 4,
				opacity: 0.6,
			});
			polylinesLayer.addLayer(polyline);
		}

		// 绘制站点
		busstops.forEach((stop, index) => {
			if (stop.latitude && stop.longitude) {
				let type = 'normal';
				if (index === 0) type = 'start';
				else if (index === busstops.length - 1) type = 'end';
				else if (index === currentStopIndex) type = 'current';

				const marker = L.marker([stop.latitude, stop.longitude], {
					icon: createStopIcon(type, index),
				});

				marker.bindPopup(`
					<div style="min-width: 120px;">
						<h4 style="margin: 0 0 4px 0; font-weight: bold;">${stop.name}</h4>
						<p style="margin: 0; font-size: 12px; color: #666;">第 ${index + 1} 站</p>
					</div>
				`);

				markersLayer.addLayer(marker);
				bounds.push([stop.latitude, stop.longitude]);
			}
		});

		// 绘制车辆当前位置
		if (currentPosition) {
			const isSelected = selectedVehicleId.value === schedule.id;
			const vehicleMarker = L.marker([currentPosition.lat, currentPosition.lng], {
				icon: createVehicleIcon(isSelected),
				zIndexOffset: 1000,
			});

			vehicleMarker.bindPopup(`
				<div style="min-width: 180px;">
					<h4 style="margin: 0 0 8px 0; font-weight: bold; color: #F97316;">
						${vehicle.vehicle?.plate_number || '未知车牌'}
					</h4>
					<p style="margin: 4px 0; font-size: 12px;">
						<strong>线路:</strong> ${vehicle.route?.code} ${vehicle.route?.name}
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
				</div>
			`);

			vehicleMarker.scheduleId = schedule.id;
			vehicleMarkers.set(schedule.id, vehicleMarker);
			markersLayer.addLayer(vehicleMarker);
			bounds.push([currentPosition.lat, currentPosition.lng]);
		}
	});

	// 调整视野以包含所有标记
	if (bounds.length > 0) {
		map.fitBounds(bounds, { padding: [30, 30] });
	}
};

// 处理车辆点击
const handleVehicleClick = (vehicle) => {
	selectedVehicleId.value = vehicle.schedule.id;

	// 更新标记样式并聚焦
	if (vehicle.currentPosition && map) {
		map.setView([vehicle.currentPosition.lat, vehicle.currentPosition.lng], 15, {
			animate: true,
		});

		// 打开弹窗
		const marker = vehicleMarkers.get(vehicle.schedule.id);
		if (marker) {
			marker.openPopup();
		}
	}

	// 刷新地图以更新选中状态
	updateMap();
};

// 组件挂载
onMounted(() => {
	nextTick(() => {
		initMap();
		loadRunningVehicles();

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
		map.remove();
		map = null;
	}
});
</script>

<style scoped>
.running-vehicle-map {
	width: 100%;
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
