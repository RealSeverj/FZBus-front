<template>
	<div class="schedule-statistics">
		<!-- 标题栏 -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<el-icon class="text-primary text-xl"><DataAnalysis /></el-icon>
				<h3 class="text-lg font-semibold">班次准点率统计</h3>
			</div>
			<el-button size="small" :loading="loading" @click="loadStatistics">
				<el-icon class="mr-1"><Refresh /></el-icon>
				刷新
			</el-button>
		</div>

		<!-- 筛选条件 -->
		<div class="flex flex-wrap gap-3 mb-4">
			<el-date-picker
				v-model="dateRange"
				type="daterange"
				range-separator="至"
				start-placeholder="开始日期"
				end-placeholder="结束日期"
				format="YYYY-MM-DD"
				value-format="YYYY-MM-DD"
				size="small"
				class="w-56"
				:shortcuts="dateShortcuts"
				@change="loadStatistics"
			/>
			<el-select
				v-model="filterRouteId"
				placeholder="选择线路"
				clearable
				filterable
				size="small"
				class="w-40"
				@change="loadStatistics"
			>
				<el-option
					v-for="r in allRoutes"
					:key="r.id"
					:label="`${r.code} - ${r.name}`"
					:value="r.id"
				/>
			</el-select>
			<el-select
				v-model="filterVehicleId"
				placeholder="选择车辆"
				clearable
				filterable
				size="small"
				class="w-32"
				@change="loadStatistics"
			>
				<el-option
					v-for="v in allVehicles"
					:key="v.id"
					:label="v.plate_number"
					:value="v.id"
				/>
			</el-select>
			<el-select
				v-model="filterEmployeeId"
				placeholder="选择司机"
				clearable
				filterable
				size="small"
				class="w-32"
				@change="loadStatistics"
			>
				<el-option
					v-for="e in allEmployees"
					:key="e.id"
					:label="e.name"
					:value="e.id"
				/>
			</el-select>
		</div>

		<!-- 统计内容 -->
		<div class="flex gap-4" style="height: 300px;">
			<!-- 饼图 -->
			<div class="flex-1 relative">
				<div ref="chartContainer" class="w-full h-full"></div>
				<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
					<el-icon class="is-loading text-2xl text-primary"><Loading /></el-icon>
					<span class="ml-2 text-gray-500">加载中...</span>
				</div>
				<div v-if="!loading && statistics.total_departed === 0" class="absolute inset-0 flex flex-col items-center justify-center">
					<el-icon class="text-4xl text-gray-300 mb-2"><PieChart /></el-icon>
					<p class="text-gray-400">暂无班次数据</p>
				</div>
			</div>

			<!-- 数据详情 -->
			<div class="w-48 flex flex-col justify-center space-y-4">
				<div class="bg-blue-50 rounded-lg p-4 text-center">
					<p class="text-xs text-gray-500 mb-1">已发班次总数</p>
					<p class="text-2xl font-bold text-blue-600">{{ statistics.total_departed }}</p>
				</div>
				<div class="bg-green-50 rounded-lg p-4 text-center">
					<p class="text-xs text-gray-500 mb-1">准点班次</p>
					<p class="text-2xl font-bold text-green-600">{{ statistics.on_time_count }}</p>
				</div>
				<div class="bg-red-50 rounded-lg p-4 text-center">
					<p class="text-xs text-gray-500 mb-1">晚点班次</p>
					<p class="text-2xl font-bold text-red-600">{{ statistics.total_departed - statistics.on_time_count }}</p>
				</div>
				<div class="bg-orange-50 rounded-lg p-4 text-center">
					<p class="text-xs text-gray-500 mb-1">准点率</p>
					<p class="text-2xl font-bold text-orange-600">{{ formatRate(statistics.on_time_rate) }}</p>
				</div>
			</div>
		</div>

		<!-- 说明 -->
		<div class="mt-3 text-xs text-gray-400 flex items-center gap-1">
			<el-icon><InfoFilled /></el-icon>
			<span>准点定义：实际发车时间与预计发车时间相差不超过5分钟</span>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import {
	DataAnalysis,
	Refresh,
	Loading,
	PieChart,
	InfoFilled,
} from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { fetchScheduleStatistics } from '@/api/schedule';
import { fetchRoutes } from '@/api/route';
import { fetchVehicles } from '@/api/vehicle';
import { fetchEmployees } from '@/api/employee';

// 图表相关
const chartContainer = ref(null);
let chart = null;

// 数据
const loading = ref(false);
const statistics = reactive({
	total_departed: 0,
	on_time_count: 0,
	on_time_rate: 0,
});

// 筛选条件
const dateRange = ref([]);
const filterRouteId = ref('');
const filterVehicleId = ref('');
const filterEmployeeId = ref('');

// 关联数据
const allRoutes = ref([]);
const allVehicles = ref([]);
const allEmployees = ref([]);

// 日期快捷选项
const dateShortcuts = [
	{
		text: '今天',
		value: () => {
			const today = new Date();
			return [today, today];
		},
	},
	{
		text: '近7天',
		value: () => {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 6);
			return [start, end];
		},
	},
	{
		text: '近30天',
		value: () => {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 29);
			return [start, end];
		},
	},
	{
		text: '本月',
		value: () => {
			const end = new Date();
			const start = new Date(end.getFullYear(), end.getMonth(), 1);
			return [start, end];
		},
	},
];

// 格式化百分比
const formatRate = (rate) => {
	if (rate === null || rate === undefined) return '0%';
	return `${(rate * 100).toFixed(1)}%`;
};

// 格式化日期为 YYYY-MM-DD
const formatDate = (date) => {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

// 初始化默认日期范围（近7天）
const initDefaultDateRange = () => {
	const end = new Date();
	const start = new Date();
	start.setDate(start.getDate() - 6);
	dateRange.value = [formatDate(start), formatDate(end)];
};

// 初始化图表
const initChart = () => {
	if (!chartContainer.value) return;
	chart = echarts.init(chartContainer.value);
	updateChart();
};

// 更新图表
const updateChart = () => {
	if (!chart) return;

	const onTimeCount = statistics.on_time_count;
	const lateCount = statistics.total_departed - statistics.on_time_count;

	const option = {
		tooltip: {
			trigger: 'item',
			formatter: '{a} <br/>{b}: {c} ({d}%)',
		},
		legend: {
			orient: 'horizontal',
			bottom: 10,
			data: ['准点班次', '晚点班次'],
		},
		series: [
			{
				name: '班次统计',
				type: 'pie',
				radius: ['40%', '70%'],
				center: ['50%', '45%'],
				avoidLabelOverlap: false,
				itemStyle: {
					borderRadius: 10,
					borderColor: '#fff',
					borderWidth: 2,
				},
				label: {
					show: true,
					position: 'outside',
					formatter: '{b}\n{d}%',
					fontSize: 12,
				},
				emphasis: {
					label: {
						show: true,
						fontSize: 14,
						fontWeight: 'bold',
					},
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.3)',
					},
				},
				labelLine: {
					show: true,
				},
				data: [
					{
						value: onTimeCount,
						name: '准点班次',
						itemStyle: { color: '#22C55E' },
					},
					{
						value: lateCount,
						name: '晚点班次',
						itemStyle: { color: '#EF4444' },
					},
				],
			},
		],
	};

	chart.setOption(option);
};

// 加载统计数据
const loadStatistics = async () => {
	loading.value = true;
	try {
		const params = {};

		if (dateRange.value && dateRange.value.length === 2) {
			params.start_date = dateRange.value[0];
			params.end_date = dateRange.value[1];
		}
		if (filterRouteId.value) {
			params.route_id = filterRouteId.value;
		}
		if (filterVehicleId.value) {
			params.vehicle_id = filterVehicleId.value;
		}
		if (filterEmployeeId.value) {
			params.employee_id = filterEmployeeId.value;
		}

		const data = await fetchScheduleStatistics(params);
		statistics.total_departed = data.total_departed || 0;
		statistics.on_time_count = data.on_time_count || 0;
		statistics.on_time_rate = data.on_time_rate || 0;

		updateChart();
	} catch (error) {
		console.error('加载统计数据失败:', error);
	} finally {
		loading.value = false;
	}
};

// 加载关联数据（线路、车辆、员工）
const loadRelatedData = async () => {
	try {
		const [routesRes, vehicles, employees] = await Promise.all([
			fetchRoutes({ per_page: 100 }),
			fetchVehicles(),
			fetchEmployees(),
		]);
		allRoutes.value = routesRes.items || routesRes || [];
		allVehicles.value = vehicles || [];
		allEmployees.value = employees || [];
	} catch (error) {
		console.error('加载关联数据失败:', error);
	}
};

// 处理窗口大小变化
const handleResize = () => {
	chart?.resize();
};

// 组件挂载
onMounted(() => {
	initDefaultDateRange();
	nextTick(() => {
		initChart();
		loadRelatedData();
		loadStatistics();
	});

	window.addEventListener('resize', handleResize);
});

// 组件卸载
onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize);
	if (chart) {
		chart.dispose();
		chart = null;
	}
});
</script>

<style scoped>
.schedule-statistics {
	width: 100%;
}
</style>
