<template>
	<div class="space-y-6">
		<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-2xl font-semibold">系统概览</h1>
				<p class="mt-1 text-sm text-gray-500">福州公交运营数据一览</p>
			</div>
			<div class="flex items-center gap-2 text-xs text-gray-500">
				<span>数据来自实时接口</span>
			</div>
		</div>

		<!-- 顶部统计卡片 -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<el-card shadow="hover" class="rounded-2xl border">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">车辆总数</p>
				<p class="mt-3 text-3xl font-semibold text-primary">{{ stats.vehicles }}</p>
			</el-card>
			<el-card shadow="hover" class="rounded-2xl border">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">线路总数</p>
				<p class="mt-3 text-3xl font-semibold text-primary">{{ stats.routes }}</p>
			</el-card>
			<el-card shadow="hover" class="rounded-2xl border">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">在职员工</p>
				<p class="mt-3 text-3xl font-semibold text-primary">{{ stats.employees }}</p>
			</el-card>
			<el-card shadow="hover" class="rounded-2xl border">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">今日班次</p>
				<p class="mt-3 text-3xl font-semibold text-primary">{{ stats.schedules }}</p>
			</el-card>
		</div>

		<!-- 最近班次列表 -->
		<el-card shadow="never" class="rounded-2xl border">
			<template #header>
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">最近班次</span>
					<el-tag size="small" type="info">占位内容</el-tag>
				</div>
			</template>
			<p class="text-sm text-gray-500">
				后续可以在这里展示最近的班次列表或图表，例如使用表格、时间轴或图表组件。
			</p>
		</el-card>
	</div>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { fetchVehicles } from '../api/vehicle';
import { fetchEmployees } from '../api/employee';
import { fetchRoutes } from '../api/route';
import { fetchSchedules } from '../api/schedule';

const stats = reactive({
	vehicles: 0,
	routes: 0,
	employees: 0,
	schedules: 0,
});

const loadStats = async () => {
	try {
		const [vehicles, routes, employees, schedules] = await Promise.all([
			fetchVehicles(),
			fetchRoutes(),
			fetchEmployees({ active: 'true' }),
			fetchSchedules(),
		]);

		stats.vehicles = Array.isArray(vehicles) ? vehicles.length : 0;
		stats.routes = Array.isArray(routes) ? routes.length : 0;
		stats.employees = Array.isArray(employees) ? employees.length : 0;
		stats.schedules = Array.isArray(schedules) ? schedules.length : 0;
	} catch (e) {
		// 错误统一在 axios 拦截器中处理
	}
};

onMounted(() => {
	loadStats();
});
</script>

<style scoped>
</style>

