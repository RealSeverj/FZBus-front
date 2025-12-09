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
import AMapLoader from '@amap/amap-jsapi-loader';

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

// 地图相关（高德）
const mapContainer = ref(null);
let map = null;
let AMap = null;
let polylineLayer = null;
let markersLayer = [];
let selectedMarker = null;

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

// 选中的站点
const selectedStopId = ref(null);

// 创建站点图标
const createStopMarker = (stop, index, isSelected = false) => {
	if (!AMap || !stop?.latitude || !stop?.longitude) return null;
	const isFirst = index === 0;
	const isLast = props.busstops.length > 0 && index === props.busstops.length - 1;
	let bgColor = '#409EFF';
	if (isFirst) bgColor = '#67C23A';
	else if (isLast) bgColor = '#F56C6C';
	const size = isSelected ? 32 : 24;
	const border = isSelected ? 4 : 3;
	const fontSize = isSelected ? 14 : 11;
	const content = `<div style="
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
	</div>`;
	return new AMap.Marker({
		position: [stop.longitude, stop.latitude],
		content,
		offset: new AMap.Pixel(size / -2, size / -2),
	});
};

// 解析 polyline 字符串为坐标数组（[lat, lng]）
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

// 初始化地图（高德）
const initMap = async () => {
	if (!mapContainer.value) return;
	if (map) return;

	AMap = await AMapLoader.load({
		key: import.meta.env.VITE_AMAP_KEY,
		version: '2.0',
		plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.ToolBar'],
	});

	map = new AMap.Map(mapContainer.value, {
		center: [119.3, 26.08],
		zoom: 13,
	});
	map.addControl(new AMap.ToolBar());
	
	// 绘制线路和站点
	drawRoute();
};

// 绘制线路
const drawRoute = () => {
	if (!map) return;

	// 清除已有图层
	if (polylineLayer && map) {
		map.remove(polylineLayer);
		polylineLayer = null;
	}
	if (markersLayer.length && map) {
		map.remove(markersLayer);
		markersLayer = [];
	}

	const pathPoints = parsePolyline(props.polyline);
	const allLngLat = [];

	// 绘制线路路径
	if (pathPoints.length > 1 && AMap && map) {
		const pathLngLat = pathPoints.map((p) => [p[1], p[0]]); // [lng, lat]
		polylineLayer = new AMap.Polyline({
			path: pathLngLat,
			strokeColor: '#409EFF',
			strokeWeight: 5,
			strokeOpacity: 0.8,
		});
		map.add(polylineLayer);
		allLngLat.push(...pathLngLat.map(([lng, lat]) => new AMap.LngLat(lng, lat)));
	}

	// 规范化站点坐标
	const normalizedBusstops = normalizeBusstops(props.busstops || []);

	// 绘制站点标记
	normalizedBusstops.forEach((stop, index) => {
		if (stop.latitude && stop.longitude) {
			const marker = createStopMarker(stop, index, false);
			if (!marker) return;
			marker.on('click', () => {
				selectedStopId.value = stop.id;
				highlightMarker(index);
			});
			markersLayer.push(marker);
			allLngLat.push(marker.getPosition());
		}
	});

	if (markersLayer.length && map) {
		map.add(markersLayer);
	}

	if (allLngLat.length && map) {
		map.setFitView(allLngLat, true, [20, 20, 20, 20]);
	}
};

// 高亮标记
const highlightMarker = (targetIndex) => {
	if (!markersLayer) return;

	// 移除之前的选中标记
	if (selectedMarker && map) {
		map.remove(selectedMarker);
		selectedMarker = null;
	}

	// 找到目标站点
	const stop = props.busstops[targetIndex];
	if (!stop || !stop.latitude || !stop.longitude || !AMap || !map) return;

	selectedMarker = createStopMarker(stop, targetIndex, true);
	if (selectedMarker) {
		map.add(selectedMarker);
		map.setZoomAndCenter(Math.max(map.getZoom(), 15), [stop.longitude, stop.latitude]);
	}
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
	nextTick(async () => {
		await initMap();
	});
});

// 组件卸载
onBeforeUnmount(() => {
	if (map) {
		map.destroy();
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
