<template>
	<div class="route-map-viewer">
		<!-- 线路信息概览 -->
		<div class="mb-4 bg-gray-50 rounded-lg p-4">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<span class="text-2xl font-bold text-primary">{{ route?.code }}</span>
					<span class="text-lg text-gray-600">{{ route?.name }}</span>
					<el-tag :type="route?.active ? 'success' : 'danger'" size="small">
						{{ route?.active ? '运营中' : '已停运' }}
					</el-tag>
				</div>
				<div v-if="route?.distance" class="text-sm text-gray-500">
					全程 {{ formatDistance(route.distance) }}
				</div>
			</div>
			
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
				<!-- 起终点 -->
				<div class="flex items-center gap-2">
					<el-icon class="text-green-500"><LocationFilled /></el-icon>
					<span class="text-gray-500">起点:</span>
					<span class="font-medium">{{ route?.origin }}</span>
				</div>
				<div class="flex items-center gap-2">
					<el-icon class="text-red-500"><LocationFilled /></el-icon>
					<span class="text-gray-500">终点:</span>
					<span class="font-medium">{{ route?.destination }}</span>
				</div>
				
				<!-- 首末班时间 -->
				<div class="flex items-center gap-2">
					<el-icon class="text-blue-500"><Clock /></el-icon>
					<span class="text-gray-500">首班:</span>
					<span class="font-medium">{{ route?.start_time || '-' }}</span>
				</div>
				<div class="flex items-center gap-2">
					<el-icon class="text-orange-500"><Clock /></el-icon>
					<span class="text-gray-500">末班:</span>
					<span class="font-medium">{{ route?.end_time || '-' }}</span>
				</div>
				
				<!-- 票价信息 -->
				<div class="flex items-center gap-2">
					<el-icon class="text-yellow-500"><Ticket /></el-icon>
					<span class="text-gray-500">票价:</span>
					<span class="font-medium">¥{{ route?.fare_price ?? 2.0 }}</span>
					<span v-if="route?.fare_discount && route.fare_discount < 1" class="text-xs text-orange-500">
						({{ (route.fare_discount * 10).toFixed(0) }}折)
					</span>
				</div>
				
				<!-- 月票 -->
				<div class="flex items-center gap-2">
					<el-icon class="text-purple-500"><CreditCard /></el-icon>
					<span class="text-gray-500">月票:</span>
					<el-tag :type="route?.monthly_pass_enabled ? 'success' : 'info'" size="small">
						{{ route?.monthly_pass_enabled ? '可用' : '不可用' }}
					</el-tag>
				</div>
				
				<!-- 归属 -->
				<div v-if="route?.ownership" class="flex items-center gap-2 col-span-2">
					<el-icon class="text-gray-500"><OfficeBuilding /></el-icon>
					<span class="text-gray-500">归属:</span>
					<span class="font-medium">{{ route.ownership }}</span>
				</div>
			</div>
		</div>

		<!-- 地图和站点列表 -->
		<div class="flex gap-4" style="height: 450px;">
			<!-- 地图区域 -->
			<div class="flex-1 relative">
				<div ref="mapContainer" class="w-full h-full rounded-lg border"></div>
				<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
					<el-icon class="is-loading text-2xl text-primary"><Loading /></el-icon>
					<span class="ml-2 text-gray-500">加载中...</span>
				</div>
			</div>
			
			<!-- 站点列表 -->
			<div class="w-64 flex flex-col">
				<div class="flex items-center justify-between mb-2">
					<h4 class="font-bold text-gray-700">
						<el-icon class="mr-1"><MapLocation /></el-icon>
						途经站点
					</h4>
					<span class="text-sm text-gray-400">共 {{ busstops.length }} 站</span>
				</div>
				<div class="flex-1 overflow-auto border rounded-lg">
					<div
						v-for="(stop, index) in busstops"
						:key="stop.id"
						class="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
						:class="{ 'bg-blue-100': selectedStopId === stop.id }"
						@click="handleStopClick(stop)"
					>
						<!-- 站点序号 -->
						<div 
							class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
							:class="getStopIndexClass(index)"
						>
							{{ stop.sequence || index + 1 }}
						</div>
						<!-- 站点名称 -->
						<span class="flex-1 text-sm truncate" :title="stop.name">{{ stop.name }}</span>
					</div>
					<div v-if="busstops.length === 0" class="text-center text-gray-400 py-8">
						暂无站点信息
					</div>
				</div>
			</div>
		</div>

		<!-- 备注信息 -->
		<div v-if="route?.remarks" class="mt-4 bg-yellow-50 rounded-lg p-3">
			<div class="flex items-start gap-2">
				<el-icon class="text-yellow-500 mt-0.5"><InfoFilled /></el-icon>
				<div>
					<span class="text-sm font-medium text-yellow-700">备注信息:</span>
					<p class="text-sm text-yellow-600 mt-1">{{ route.remarks }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
	LocationFilled,
	Clock,
	Ticket,
	CreditCard,
	OfficeBuilding,
	MapLocation,
	InfoFilled,
	Loading,
} from '@element-plus/icons-vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Props
const props = defineProps({
	route: {
		type: Object,
		default: null,
	},
	busstops: {
		type: Array,
		default: () => [],
	},
	polyline: {
		type: String,
		default: '',
	},
	loading: {
		type: Boolean,
		default: false,
	},
});

// 地图相关
const mapContainer = ref(null);
let map = null;
let polylineLayer = null;
let markersLayer = null;
let selectedMarker = null;

// 选中的站点
const selectedStopId = ref(null);

// 修复 Leaflet 默认图标问题
const fixLeafletIcons = () => {
	delete L.Icon.Default.prototype._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
		iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
		shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
	});
};

// 创建站点图标
const createStopIcon = (index, isSelected = false) => {
	const isFirst = index === 0;
	const isLast = props.busstops.length > 0 && index === props.busstops.length - 1;
	
	let bgColor = '#409EFF'; // 普通站点：蓝色
	if (isFirst) bgColor = '#67C23A'; // 起点：绿色
	else if (isLast) bgColor = '#F56C6C'; // 终点：红色
	
	const size = isSelected ? 32 : 24;
	const border = isSelected ? 4 : 3;
	const fontSize = isSelected ? 14 : 11;

	return L.divIcon({
		className: 'bus-stop-marker',
		html: `<div style="
			background-color: ${bgColor};
			width: ${size}px;
			height: ${size}px;
			border-radius: 50%;
			border: ${border}px solid white;
			box-shadow: 0 2px 6px rgba(0,0,0,0.3);
			display: flex;
			align-items: center;
			justify-content: center;
			${isSelected ? 'animation: pulse 1.5s infinite;' : ''}
		">
			<span style="color: white; font-size: ${fontSize}px; font-weight: bold;">${index + 1}</span>
		</div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
		popupAnchor: [0, -size / 2],
	});
};

// 解析 polyline 字符串为坐标数组
const parsePolyline = (polylineStr) => {
	if (!polylineStr) return [];
	
	// polyline 格式: "lng1,lat1;lng2,lat2;..."
	const points = polylineStr.split(';').map((point) => {
		const [lng, lat] = point.split(',').map(Number);
		if (!isNaN(lng) && !isNaN(lat)) {
			return [lat, lng]; // Leaflet 使用 [lat, lng] 格式
		}
		return null;
	}).filter(Boolean);
	
	return points;
};

// 初始化地图
const initMap = () => {
	if (!mapContainer.value) return;

	fixLeafletIcons();

	// 福州市中心坐标
	const fuzhhouCenter = [26.08, 119.3];

	map = L.map(mapContainer.value, {
		center: fuzhhouCenter,
		zoom: 13,
		zoomControl: true,
	});

	// 使用 OpenStreetMap 瓦片图层
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		maxZoom: 19,
	}).addTo(map);

	// 创建图层组
	markersLayer = L.layerGroup().addTo(map);
	
	// 绘制线路和站点
	drawRoute();
};

// 绘制线路
const drawRoute = () => {
	if (!map) return;

	// 清除已有图层
	if (polylineLayer) {
		map.removeLayer(polylineLayer);
		polylineLayer = null;
	}
	markersLayer?.clearLayers();

	// 绘制线路路径
	const pathPoints = parsePolyline(props.polyline);
	if (pathPoints.length > 1) {
		polylineLayer = L.polyline(pathPoints, {
			color: '#409EFF',
			weight: 5,
			opacity: 0.8,
		}).addTo(map);

		// 调整地图视野以适应线路
		map.fitBounds(polylineLayer.getBounds(), { padding: [20, 20] });
	}

	// 绘制站点标记
	props.busstops.forEach((stop, index) => {
		if (stop.latitude && stop.longitude) {
			const marker = L.marker([stop.latitude, stop.longitude], {
				icon: createStopIcon(index),
			});

			marker.bindPopup(`
				<div style="min-width: 150px;">
					<h4 style="margin: 0 0 8px 0; font-weight: bold;">${stop.name}</h4>
					<p style="margin: 4px 0; font-size: 12px; color: #666;">第 ${stop.sequence || index + 1} 站</p>
					${stop.amap_id ? `<p style="margin: 4px 0; font-size: 12px; color: #999;">高德ID: ${stop.amap_id}</p>` : ''}
				</div>
			`);

			marker.stopId = stop.id;
			marker.stopIndex = index;
			
			marker.on('click', () => {
				selectedStopId.value = stop.id;
				highlightMarker(index);
			});

			markersLayer.addLayer(marker);
		}
	});

	// 如果没有路径但有站点，则根据站点调整视野
	if (pathPoints.length <= 1 && props.busstops.length > 0) {
		const validStops = props.busstops.filter(s => s.latitude && s.longitude);
		if (validStops.length > 0) {
			const bounds = L.latLngBounds(validStops.map(s => [s.latitude, s.longitude]));
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}
};

// 高亮标记
const highlightMarker = (targetIndex) => {
	if (!markersLayer) return;

	// 移除之前的选中标记
	if (selectedMarker) {
		map.removeLayer(selectedMarker);
		selectedMarker = null;
	}

	// 找到目标站点
	const stop = props.busstops[targetIndex];
	if (!stop || !stop.latitude || !stop.longitude) return;

	// 创建选中标记
	selectedMarker = L.marker([stop.latitude, stop.longitude], {
		icon: createStopIcon(targetIndex, true),
		zIndexOffset: 1000,
	}).addTo(map);

	selectedMarker.bindPopup(`
		<div style="min-width: 150px;">
			<h4 style="margin: 0 0 8px 0; font-weight: bold; color: #E6A23C;">${stop.name}</h4>
			<p style="margin: 4px 0; font-size: 12px; color: #666;">第 ${stop.sequence || targetIndex + 1} 站</p>
			${stop.amap_id ? `<p style="margin: 4px 0; font-size: 12px; color: #999;">高德ID: ${stop.amap_id}</p>` : ''}
		</div>
	`).openPopup();

	// 平滑移动到该位置
	map.setView([stop.latitude, stop.longitude], Math.max(map.getZoom(), 15), {
		animate: true,
	});
};

// 处理站点点击
const handleStopClick = (stop) => {
	selectedStopId.value = stop.id;
	const index = props.busstops.findIndex(s => s.id === stop.id);
	if (index !== -1) {
		highlightMarker(index);
	}
};

// 获取站点序号样式类
const getStopIndexClass = (index) => {
	if (index === 0) return 'bg-green-500'; // 起点
	if (index === props.busstops.length - 1) return 'bg-red-500'; // 终点
	return 'bg-blue-500'; // 普通站点
};

// 格式化距离
const formatDistance = (meters) => {
	if (!meters) return '-';
	if (meters >= 1000) {
		return `${(meters / 1000).toFixed(1)} km`;
	}
	return `${Math.round(meters)} m`;
};

// 监听数据变化
watch(
	() => [props.polyline, props.busstops],
	() => {
		if (map) {
			nextTick(() => {
				drawRoute();
			});
		}
	},
	{ deep: true }
);

// 组件挂载
onMounted(() => {
	nextTick(() => {
		initMap();
	});
});

// 组件卸载
onBeforeUnmount(() => {
	if (map) {
		map.remove();
		map = null;
	}
});
</script>

<style scoped>
.route-map-viewer {
	width: 100%;
}

/* 站点列表滚动条样式 */
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
		box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.7);
	}
	70% {
		box-shadow: 0 0 0 10px rgba(230, 162, 60, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(230, 162, 60, 0);
	}
}
</style>
