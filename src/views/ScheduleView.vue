<template>
	<div class="p-6">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">排班管理</h1>
			<el-button type="primary" @click="handleAdd">
				<el-icon class="mr-1"><Plus /></el-icon>
				新增排班
			</el-button>
		</div>

		<!-- 搜索筛选栏 -->
		<el-card class="mb-6" shadow="never">
			<div class="flex flex-wrap gap-4 items-center">
				<el-date-picker
					v-model="filterDateRange"
					type="daterange"
					range-separator="至"
					start-placeholder="开始日期"
					end-placeholder="结束日期"
					format="YYYY-MM-DD"
					value-format="YYYY-MM-DD"
					class="w-64"
					@change="loadSchedules"
				/>
				<el-select
					v-model="filterStatus"
					placeholder="班次状态"
					clearable
					class="w-32"
					@change="loadSchedules"
				>
					<el-option label="全部" value="" />
					<el-option label="已计划" value="scheduled" />
					<el-option label="运行中" value="running" />
					<el-option label="已完成" value="completed" />
					<el-option label="已取消" value="cancelled" />
				</el-select>
				<el-select
					v-model="filterVehicleId"
					placeholder="选择车辆"
					clearable
					filterable
					class="w-40"
					@change="loadSchedules"
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
					placeholder="选择员工"
					clearable
					filterable
					class="w-36"
					@change="loadSchedules"
				>
					<el-option
						v-for="e in allEmployees"
						:key="e.id"
						:label="e.name"
						:value="e.id"
					/>
				</el-select>
				<el-select
					v-model="filterRouteId"
					placeholder="选择线路"
					clearable
					filterable
					class="w-40"
					@change="loadSchedules"
				>
					<el-option
						v-for="r in allRoutes"
						:key="r.id"
						:label="`${r.code} - ${r.name}`"
						:value="r.id"
					/>
				</el-select>
				<el-select
					v-model="filterDirection"
					placeholder="运行方向"
					clearable
					class="w-28"
					@change="loadSchedules"
				>
					<el-option label="全部" value="" />
					<el-option label="上行" value="up" />
					<el-option label="下行" value="down" />
				</el-select>
				<el-button type="primary" @click="loadSchedules">
					<el-icon class="mr-1"><Search /></el-icon>
					查询
				</el-button>
				<el-button @click="resetFilters">
					<el-icon class="mr-1"><Refresh /></el-icon>
					重置
				</el-button>
			</div>
		</el-card>

		<!-- 数据表格 -->
		<el-card shadow="never">
			<el-table
				v-loading="loading"
				:data="schedules"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
			>
				<el-table-column prop="id" label="ID" width="70" align="center" />
				<el-table-column prop="route" label="线路" min-width="160">
					<template #default="{ row }">
						<div v-if="row.route">
							<span class="font-semibold text-primary">{{ row.route.code }}</span>
							<span class="text-gray-500 ml-1">{{ row.route.name }}</span>
						</div>
						<span v-else class="text-gray-400">ID: {{ row.route_id }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="vehicle" label="车辆" min-width="130">
					<template #default="{ row }">
						<div v-if="row.vehicle">
							<span class="font-semibold">{{ row.vehicle.plate_number }}</span>
						</div>
						<span v-else class="text-gray-400">ID: {{ row.vehicle_id }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="employee" label="司机" min-width="120">
					<template #default="{ row }">
						<div v-if="row.employee">
							<span>{{ row.employee.name }}</span>
							<el-tag size="small" type="info" class="ml-1">{{ row.employee.role }}</el-tag>
						</div>
						<span v-else class="text-gray-400">ID: {{ row.employee_id }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="scheduled_departure_time" label="预计发车" min-width="160">
					<template #default="{ row }">
						{{ formatDateTime(row.scheduled_departure_time) }}
					</template>
				</el-table-column>
				<el-table-column prop="departure_time" label="实际发车" min-width="160">
					<template #default="{ row }">
						{{ formatDateTime(row.departure_time) || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="arrival_time" label="到达时间" min-width="160">
					<template #default="{ row }">
						{{ formatDateTime(row.arrival_time) || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="direction" label="方向" width="80" align="center">
					<template #default="{ row }">
						<el-tag :type="row.direction === 'up' ? 'primary' : 'success'" size="small">
							{{ row.direction === 'up' ? '上行' : '下行' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="getStatusTagType(row.status)">
							{{ getStatusText(row.status) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="200" align="center" fixed="right">
					<template #default="{ row }">
						<el-button type="primary" link size="small" @click="handleEdit(row)">
							<el-icon class="mr-1"><Edit /></el-icon>
							编辑
						</el-button>
						<el-button
							v-if="row.status === 'scheduled'"
							type="success"
							link
							size="small"
							@click="handleUpdateStatus(row, 'running')"
						>
							发车
						</el-button>
						<el-button
							v-if="row.status === 'running'"
							type="warning"
							link
							size="small"
							@click="handleUpdateStatus(row, 'completed')"
						>
							到达
						</el-button>
						<el-button type="danger" link size="small" @click="handleDelete(row)">
							<el-icon class="mr-1"><Delete /></el-icon>
							删除
						</el-button>
					</template>
				</el-table-column>
			</el-table>

			<!-- 分页 -->
			<div class="flex justify-end mt-4">
				<el-pagination
					v-model:current-page="currentPage"
					v-model:page-size="pageSize"
					:page-sizes="[10, 20, 50, 100]"
					:total="schedules.length"
					layout="total, sizes, prev, pager, next, jumper"
					background
				/>
			</div>
		</el-card>

		<!-- 新增/编辑对话框 -->
		<el-dialog
			v-model="dialogVisible"
			:title="isEdit ? '编辑排班' : '新增排班'"
			width="600px"
			destroy-on-close
			@close="resetForm"
		>
			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				label-width="100px"
				class="px-4"
			>
				<el-form-item label="选择线路" prop="route_id">
					<el-select
						v-model="form.route_id"
						placeholder="请输入关键词搜索线路"
						filterable
						remote
						:remote-method="searchRoutes"
						:loading="routeSearchLoading"
						class="w-full"
					>
						<el-option
							v-for="r in routeOptions"
							:key="r.id"
							:label="`${r.code} - ${r.name}`"
							:value="r.id"
						>
							<div class="flex justify-between">
								<span>{{ r.code }} - {{ r.name }}</span>
								<span class="text-xs text-gray-400">{{ r.origin }} → {{ r.destination }}</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>
				<el-form-item label="选择车辆" prop="vehicle_id">
					<el-select
						v-model="form.vehicle_id"
						placeholder="请选择车辆"
						filterable
						class="w-full"
					>
						<el-option
							v-for="v in activeVehicles"
							:key="v.id"
							:label="v.plate_number"
							:value="v.id"
						>
							<div class="flex justify-between">
								<span>{{ v.plate_number }}</span>
								<span class="text-xs text-gray-400">{{ v.model || '未知车型' }} | {{ v.capacity }}人</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>
				<el-form-item label="选择司机" prop="employee_id">
					<el-select
						v-model="form.employee_id"
						placeholder="请选择司机"
						filterable
						class="w-full"
					>
						<el-option
							v-for="e in activeDrivers"
							:key="e.id"
							:label="e.name"
							:value="e.id"
						>
							<div class="flex justify-between">
								<span>{{ e.name }}</span>
								<span class="text-xs text-gray-400">{{ e.role }} | {{ e.phone || '无电话' }}</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>
				<el-form-item label="预计发车" prop="scheduled_departure_time">
					<el-date-picker
						v-model="form.scheduled_departure_time"
						type="datetime"
						placeholder="选择预计发车时间"
						format="YYYY-MM-DD HH:mm"
						value-format="YYYY-MM-DDTHH:mm:ss"
						class="w-full"
					/>
				</el-form-item>
				<el-form-item label="运行方向" prop="direction">
					<el-radio-group v-model="form.direction">
						<el-radio value="up">上行</el-radio>
						<el-radio value="down">下行</el-radio>
					</el-radio-group>
				</el-form-item>
				<el-form-item v-if="isEdit" label="班次状态" prop="status">
					<el-select v-model="form.status" placeholder="请选择状态" class="w-full">
						<el-option label="已计划" value="scheduled" />
						<el-option label="运行中" value="running" />
						<el-option label="已完成" value="completed" />
						<el-option label="已取消" value="cancelled" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<el-button @click="dialogVisible = false">取消</el-button>
					<el-button type="primary" :loading="submitting" @click="handleSubmit">
						{{ isEdit ? '保存' : '创建' }}
					</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue';
import {
	fetchSchedules,
	createSchedule,
	updateSchedule,
	deleteSchedule,
} from '@/api/schedule';
import { fetchVehicles } from '@/api/vehicle';
import { fetchEmployees } from '@/api/employee';
import { fetchRoutes, fetchRouteDetail } from '@/api/route';

// 列表数据
const schedules = ref([]);
const loading = ref(false);

// 关联数据
const allVehicles = ref([]);
const allEmployees = ref([]);
const allRoutes = ref([]);

// 线路远程搜索
const routeOptions = ref([]);
const routeSearchLoading = ref(false);

// 搜索筛选
const filterDateRange = ref([]);
const filterStatus = ref('');
const filterVehicleId = ref('');
const filterEmployeeId = ref('');
const filterRouteId = ref('');
const filterDirection = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref(null);

// 表单数据
const form = reactive({
	id: null,
	route_id: '',
	vehicle_id: '',
	employee_id: '',
	scheduled_departure_time: '',
	direction: 'up',
	status: 'scheduled',
});

// 表单校验规则
const rules = {
	route_id: [{ required: true, message: '请选择线路', trigger: 'change' }],
	vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }],
	employee_id: [{ required: true, message: '请选择司机', trigger: 'change' }],
	scheduled_departure_time: [{ required: true, message: '请选择预计发车时间', trigger: 'change' }],
};

// 计算可用的车辆（运营中）
const activeVehicles = computed(() => allVehicles.value.filter(v => v.in_service));

// 计算可用的司机（在职）
const activeDrivers = computed(() => allEmployees.value.filter(e => e.active));

// 远程搜索线路
const searchRoutes = async (query) => {
	if (!query) {
		routeOptions.value = [];
		return;
	}
	routeSearchLoading.value = true;
	try {
		const res = await fetchRoutes({ keyword: query, active: true, per_page: 20 });
		routeOptions.value = res.items || [];
	} catch (error) {
		console.error('搜索线路失败:', error);
		routeOptions.value = [];
	} finally {
		routeSearchLoading.value = false;
	}
};

// 获取状态标签类型
const getStatusTagType = (status) => {
	const map = {
		scheduled: 'info',
		running: 'warning',
		completed: 'success',
		cancelled: 'danger',
	};
	return map[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
	const map = {
		scheduled: '已计划',
		running: '运行中',
		completed: '已完成',
		cancelled: '已取消',
	};
	return map[status] || status;
};

// 格式化日期时间
const formatDateTime = (isoString) => {
	if (!isoString) return '';
	const date = new Date(isoString);
	return date.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

// 加载排班列表
const loadSchedules = async () => {
	loading.value = true;
	try {
		const params = { include_details: true };
		if (filterStatus.value) {
			params.status = filterStatus.value;
		}
		if (filterVehicleId.value) {
			params.vehicle_id = filterVehicleId.value;
		}
		if (filterEmployeeId.value) {
			params.employee_id = filterEmployeeId.value;
		}
		if (filterRouteId.value) {
			params.route_id = filterRouteId.value;
		}
		if (filterDirection.value) {
			params.direction = filterDirection.value;
		}
		if (filterDateRange.value && filterDateRange.value.length === 2) {
			params.start_date = filterDateRange.value[0];
			params.end_date = filterDateRange.value[1];
		}
		const data = await fetchSchedules(params);
		schedules.value = data || [];
	} catch (error) {
		console.error('获取排班列表失败:', error);
	} finally {
		loading.value = false;
	}
};

// 加载关联数据
const loadRelatedData = async () => {
	try {
		const [vehicles, employees, routesRes] = await Promise.all([
			fetchVehicles(),
			fetchEmployees({ role: '司机' }), // 只获取司机角色员工
			fetchRoutes({ per_page: 100 }),
		]);
		allVehicles.value = vehicles || [];
		allEmployees.value = employees || [];
		// 仅用于筛选下拉框，保留allRoutes
		allRoutes.value = routesRes.items || routesRes || [];
	} catch (error) {
		console.error('加载关联数据失败:', error);
	}
};

// 重置筛选条件
const resetFilters = () => {
	filterDateRange.value = [];
	filterStatus.value = '';
	filterVehicleId.value = '';
	filterEmployeeId.value = '';
	filterRouteId.value = '';
	filterDirection.value = '';
	loadSchedules();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.route_id = '';
	form.vehicle_id = '';
	form.employee_id = '';
	form.scheduled_departure_time = '';
	form.direction = 'up';
	form.status = 'scheduled';
	isEdit.value = false;
	routeOptions.value = [];
	formRef.value?.resetFields();
};

// 新增排班
const handleAdd = () => {
	resetForm();
	isEdit.value = false;
	dialogVisible.value = true;
};

// 编辑排班
const handleEdit = async (row) => {
	resetForm();
	isEdit.value = true;
	form.id = row.id;
	form.route_id = row.route_id;
	form.vehicle_id = row.vehicle_id;
	form.employee_id = row.employee_id;
	form.scheduled_departure_time = row.scheduled_departure_time;
	form.direction = row.direction || 'up';
	form.status = row.status;
	// 将当前线路添加到选项中
	if (row.route) {
		routeOptions.value = [row.route];
	} else if (row.route_id) {
		try {
			const routeDetail = await fetchRouteDetail(row.route_id);
			routeOptions.value = [routeDetail];
		} catch (error) {
			console.error('获取线路详情失败:', error);
		}
	}
	dialogVisible.value = true;
};

// 更新状态
const handleUpdateStatus = async (row, newStatus) => {
	const statusText = getStatusText(newStatus);
	try {
		await ElMessageBox.confirm(
			`确定要将此班次状态更新为「${statusText}」吗？`,
			'状态更新',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
			},
		);

		// 后端会自动处理实际发车时间和到达时间
		const payload = { status: newStatus };

		await updateSchedule(row.id, payload);
		ElMessage.success('状态更新成功');
		loadSchedules();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('更新状态失败:', error);
		}
	}
};

// 删除排班
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			'确定要删除此排班记录吗？此操作不可恢复。',
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteSchedule(row.id);
		ElMessage.success('删除成功');
		loadSchedules();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除排班失败:', error);
		}
	}
};

// 提交表单
const handleSubmit = async () => {
	if (!formRef.value) return;

	try {
		await formRef.value.validate();
		submitting.value = true;

		if (isEdit.value) {
			// 编辑时可以更新预计发车时间、关联ID、方向和状态
			const payload = {
				route_id: form.route_id,
				vehicle_id: form.vehicle_id,
				employee_id: form.employee_id,
				scheduled_departure_time: form.scheduled_departure_time,
				direction: form.direction,
				status: form.status,
			};
			await updateSchedule(form.id, payload);
			ElMessage.success('更新成功');
		} else {
			// 创建时提交预计发车时间、关联ID和方向
			const payload = {
				route_id: form.route_id,
				vehicle_id: form.vehicle_id,
				employee_id: form.employee_id,
				scheduled_departure_time: form.scheduled_departure_time,
				direction: form.direction,
			};
			await createSchedule(payload);
			ElMessage.success('创建成功');
		}

		dialogVisible.value = false;
		loadSchedules();
	} catch (error) {
		if (error !== false) {
			console.error('提交失败:', error);
		}
	} finally {
		submitting.value = false;
	}
};

// 页面加载时获取数据
onMounted(async () => {
	await loadRelatedData();
	loadSchedules();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
