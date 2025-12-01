<template>
	<div class="p-6">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">线路管理</h1>
			<el-button type="primary" @click="handleAdd">
				<el-icon class="mr-1"><Plus /></el-icon>
				添加线路
			</el-button>
		</div>

		<!-- 搜索筛选栏 -->
		<el-card class="mb-6" shadow="never">
			<div class="flex flex-wrap gap-4 items-center">
				<el-input
					v-model="searchCode"
					placeholder="搜索线路编号"
					clearable
					class="w-40"
					@clear="loadRoutes"
					@keyup.enter="loadRoutes"
				>
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
				<el-input
					v-model="searchName"
					placeholder="搜索线路名称"
					clearable
					class="w-48"
					@clear="loadRoutes"
					@keyup.enter="loadRoutes"
				/>
				<el-select
					v-model="filterActive"
					placeholder="线路状态"
					clearable
					class="w-32"
					@change="loadRoutes"
				>
					<el-option label="全部" value="" />
					<el-option label="运营中" value="true" />
					<el-option label="已停运" value="false" />
				</el-select>
				<el-button type="primary" @click="loadRoutes">
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
				:data="filteredRoutes"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
			>
				<el-table-column prop="id" label="ID" width="70" align="center" />
				<el-table-column prop="code" label="线路编号" width="100">
					<template #default="{ row }">
						<span class="font-semibold text-primary">{{ row.code }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="name" label="线路名称" min-width="140" />
				<el-table-column prop="origin" label="起点" min-width="120">
					<template #default="{ row }">
						<el-icon class="text-green-500 mr-1"><LocationFilled /></el-icon>
						{{ row.origin }}
					</template>
				</el-table-column>
				<el-table-column prop="destination" label="终点" min-width="120">
					<template #default="{ row }">
						<el-icon class="text-red-500 mr-1"><LocationFilled /></el-icon>
						{{ row.destination }}
					</template>
				</el-table-column>
				<el-table-column prop="distance_km" label="里程" width="100" align="center">
					<template #default="{ row }">
						<span v-if="row.distance_km">{{ row.distance_km }} km</span>
						<span v-else class="text-gray-400">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="vehicles" label="分配车辆" min-width="180">
					<template #default="{ row }">
						<div v-if="row.vehicles && row.vehicles.length > 0" class="flex flex-wrap gap-1">
							<el-tag
								v-for="vehicle in row.vehicles"
								:key="vehicle.id"
								type="success"
								size="small"
								closable
								@close="handleRemoveVehicle(row, vehicle)"
							>
								{{ vehicle.plate_number }}
							</el-tag>
						</div>
						<span v-else class="text-gray-400">未分配</span>
					</template>
				</el-table-column>
				<el-table-column prop="active" label="状态" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="row.active ? 'success' : 'danger'">
							{{ row.active ? '运营中' : '已停运' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="280" align="center" fixed="right">
					<template #default="{ row }">
						<el-button type="info" link size="small" @click="handleViewSchedules(row)">
							<el-icon class="mr-1"><Calendar /></el-icon>
							排班
						</el-button>
						<el-button type="success" link size="small" @click="handleAssignVehicle(row)">
							<el-icon class="mr-1"><Van /></el-icon>
							分配
						</el-button>
						<el-button type="primary" link size="small" @click="handleEdit(row)">
							<el-icon class="mr-1"><Edit /></el-icon>
							编辑
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
					:total="totalCount"
					layout="total, sizes, prev, pager, next, jumper"
					background
				/>
			</div>
		</el-card>

		<!-- 新增/编辑对话框 -->
		<el-dialog
			v-model="dialogVisible"
			:title="isEdit ? '编辑线路' : '添加线路'"
			width="550px"
			destroy-on-close
			@close="resetForm"
		>
			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				label-width="80px"
				class="px-4"
			>
				<el-form-item label="线路编号" prop="code">
					<el-input
						v-model="form.code"
						placeholder="请输入线路编号，如：1路、K1"
						maxlength="20"
					/>
				</el-form-item>
				<el-form-item label="线路名称" prop="name">
					<el-input
						v-model="form.name"
						placeholder="请输入线路名称"
						maxlength="100"
					/>
				</el-form-item>
				<el-form-item label="起点站" prop="origin">
					<el-input
						v-model="form.origin"
						placeholder="请输入起点站名称"
						maxlength="100"
					/>
				</el-form-item>
				<el-form-item label="终点站" prop="destination">
					<el-input
						v-model="form.destination"
						placeholder="请输入终点站名称"
						maxlength="100"
					/>
				</el-form-item>
				<el-form-item label="线路里程" prop="distance_km">
					<el-input-number
						v-model="form.distance_km"
						:min="0"
						:max="1000"
						:precision="1"
						placeholder="请输入里程"
						class="w-full"
					>
						<template #suffix>km</template>
					</el-input-number>
				</el-form-item>
				<el-form-item label="状态" prop="active">
					<el-switch
						v-model="form.active"
						active-text="运营中"
						inactive-text="已停运"
						inline-prompt
					/>
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

		<!-- 分配车辆对话框 -->
		<el-dialog
			v-model="vehicleDialogVisible"
			title="分配车辆"
			width="600px"
			destroy-on-close
		>
			<div class="mb-4">
				<p class="text-sm text-gray-500 mb-2">
					当前线路：<span class="font-semibold text-primary">{{ currentRoute?.code }} - {{ currentRoute?.name }}</span>
				</p>
				<p class="text-sm text-gray-500">
					已分配车辆：
					<span v-if="currentRoute?.vehicles?.length">
						{{ currentRoute.vehicles.map(v => v.plate_number).join('、') }}
					</span>
					<span v-else class="text-gray-400">无</span>
				</p>
			</div>
			<el-divider />
			<el-form label-width="80px">
				<el-form-item label="选择车辆">
					<el-select
						v-model="selectedVehicleIds"
						multiple
						filterable
						placeholder="请选择要分配的车辆"
						class="w-full"
						:loading="vehiclesLoading"
					>
						<el-option
							v-for="vehicle in availableVehicles"
							:key="vehicle.id"
							:label="vehicle.plate_number"
							:value="vehicle.id"
						>
							<div class="flex justify-between items-center">
								<span>{{ vehicle.plate_number }}</span>
								<span class="text-xs text-gray-400">
									{{ vehicle.model || '未知车型' }} | {{ vehicle.capacity }}人
								</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<el-button @click="vehicleDialogVisible = false">取消</el-button>
					<el-button
						type="primary"
						:loading="assigningVehicles"
						:disabled="selectedVehicleIds.length === 0"
						@click="handleConfirmAssign"
					>
						确认分配
					</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 排班查询对话框 -->
		<el-dialog
			v-model="scheduleDialogVisible"
			title="线路排班记录"
			width="900px"
			destroy-on-close
		>
			<div class="mb-4">
				<p class="text-sm text-gray-500 mb-2">
					当前线路：<span class="font-semibold text-primary">{{ currentRoute?.code }} - {{ currentRoute?.name }}</span>
					<span class="text-gray-400 ml-2">({{ currentRoute?.origin }} → {{ currentRoute?.destination }})</span>
				</p>
			</div>
			<div class="flex gap-4 mb-4">
				<el-date-picker
					v-model="scheduleDateRange"
					type="daterange"
					range-separator="至"
					start-placeholder="开始日期"
					end-placeholder="结束日期"
					format="YYYY-MM-DD"
					value-format="YYYY-MM-DD"
					class="w-64"
					@change="loadRouteSchedules"
				/>
				<el-select
					v-model="scheduleStatus"
					placeholder="班次状态"
					clearable
					class="w-32"
					@change="loadRouteSchedules"
				>
					<el-option label="全部" value="" />
					<el-option label="已计划" value="scheduled" />
					<el-option label="运行中" value="running" />
					<el-option label="已完成" value="completed" />
					<el-option label="已取消" value="cancelled" />
				</el-select>
			</div>
			<el-table
				v-loading="schedulesLoading"
				:data="routeSchedules"
				stripe
				border
				max-height="400"
			>
				<el-table-column prop="id" label="ID" width="70" align="center" />
				<el-table-column prop="vehicle" label="车辆" width="120">
					<template #default="{ row }">
						<span v-if="row.vehicle">{{ row.vehicle.plate_number }}</span>
						<span v-else class="text-gray-400">ID: {{ row.vehicle_id }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="employee" label="司机" width="100">
					<template #default="{ row }">
						<span v-if="row.employee">{{ row.employee.name }}</span>
						<span v-else class="text-gray-400">ID: {{ row.employee_id }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="departure_time" label="发车时间" min-width="150">
					<template #default="{ row }">
						{{ formatDateTime(row.departure_time) }}
					</template>
				</el-table-column>
				<el-table-column prop="arrival_time" label="到达时间" min-width="150">
					<template #default="{ row }">
						{{ formatDateTime(row.arrival_time) || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="getScheduleStatusTagType(row.status)" size="small">
							{{ getScheduleStatusText(row.status) }}
						</el-tag>
					</template>
				</el-table-column>
			</el-table>
			<template #footer>
				<div class="flex justify-end">
					<el-button @click="scheduleDialogVisible = false">关闭</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, Edit, Delete, Van, LocationFilled, Calendar } from '@element-plus/icons-vue';
import {
	fetchRoutes,
	createRoute,
	updateRoute,
	deleteRoute,
	addVehiclesToRoute,
	removeVehicleFromRoute,
	fetchRouteSchedules,
} from '@/api/route';
import { fetchVehicles } from '@/api/vehicle';

// 列表数据
const routes = ref([]);
const loading = ref(false);

// 搜索筛选
const searchCode = ref('');
const searchName = ref('');
const filterActive = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref(null);

// 车辆分配对话框
const vehicleDialogVisible = ref(false);
const currentRoute = ref(null);
const allVehicles = ref([]);
const selectedVehicleIds = ref([]);
const vehiclesLoading = ref(false);
const assigningVehicles = ref(false);

// 排班查询对话框
const scheduleDialogVisible = ref(false);
const routeSchedules = ref([]);
const schedulesLoading = ref(false);
const scheduleDateRange = ref([]);
const scheduleStatus = ref('');

// 表单数据
const form = reactive({
	id: null,
	code: '',
	name: '',
	origin: '',
	destination: '',
	distance_km: null,
	active: true,
});

// 表单校验规则
const rules = {
	code: [
		{ required: true, message: '请输入线路编号', trigger: 'blur' },
		{ min: 1, max: 20, message: '线路编号长度在 1 到 20 个字符', trigger: 'blur' },
	],
	name: [
		{ required: true, message: '请输入线路名称', trigger: 'blur' },
		{ min: 2, max: 100, message: '线路名称长度在 2 到 100 个字符', trigger: 'blur' },
	],
	origin: [
		{ required: true, message: '请输入起点站', trigger: 'blur' },
	],
	destination: [
		{ required: true, message: '请输入终点站', trigger: 'blur' },
	],
};

// 计算过滤后的线路列表
const filteredRoutes = computed(() => {
	let result = routes.value;

	// 按线路编号搜索
	if (searchCode.value) {
		result = result.filter((r) =>
			r.code.toLowerCase().includes(searchCode.value.toLowerCase()),
		);
	}

	// 按线路名称搜索
	if (searchName.value) {
		result = result.filter((r) =>
			r.name.toLowerCase().includes(searchName.value.toLowerCase()),
		);
	}

	return result;
});

// 计算可分配的车辆（排除已分配的）
const availableVehicles = computed(() => {
	if (!currentRoute.value) return allVehicles.value;
	const assignedIds = (currentRoute.value.vehicles || []).map(v => v.id);
	return allVehicles.value.filter(v => !assignedIds.includes(v.id) && v.in_service);
});

// 计算总数
const totalCount = computed(() => filteredRoutes.value.length);

// 加载线路列表
const loadRoutes = async () => {
	loading.value = true;
	try {
		const params = { include_vehicles: true };
		if (filterActive.value !== '') {
			params.active = filterActive.value;
		}
		const data = await fetchRoutes(params);
		routes.value = data || [];
	} catch (error) {
		console.error('获取线路列表失败:', error);
	} finally {
		loading.value = false;
	}
};

// 加载所有车辆
const loadVehicles = async () => {
	vehiclesLoading.value = true;
	try {
		const data = await fetchVehicles({ in_service: 'true' });
		allVehicles.value = data || [];
	} catch (error) {
		console.error('获取车辆列表失败:', error);
	} finally {
		vehiclesLoading.value = false;
	}
};

// 重置筛选条件
const resetFilters = () => {
	searchCode.value = '';
	searchName.value = '';
	filterActive.value = '';
	loadRoutes();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.code = '';
	form.name = '';
	form.origin = '';
	form.destination = '';
	form.distance_km = null;
	form.active = true;
	isEdit.value = false;
	formRef.value?.resetFields();
};

// 添加线路
const handleAdd = () => {
	resetForm();
	isEdit.value = false;
	dialogVisible.value = true;
};

// 编辑线路
const handleEdit = (row) => {
	resetForm();
	isEdit.value = true;
	form.id = row.id;
	form.code = row.code;
	form.name = row.name;
	form.origin = row.origin;
	form.destination = row.destination;
	form.distance_km = row.distance_km;
	form.active = row.active;
	dialogVisible.value = true;
};

// 删除线路
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			`确定要删除线路「${row.code} - ${row.name}」吗？此操作不可恢复。`,
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteRoute(row.id);
		ElMessage.success('删除成功');
		loadRoutes();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除线路失败:', error);
		}
	}
};

// 打开分配车辆对话框
const handleAssignVehicle = async (row) => {
	currentRoute.value = row;
	selectedVehicleIds.value = [];
	vehicleDialogVisible.value = true;
	await loadVehicles();
};

// 确认分配车辆
const handleConfirmAssign = async () => {
	if (selectedVehicleIds.value.length === 0) return;
	
	assigningVehicles.value = true;
	try {
		await addVehiclesToRoute(currentRoute.value.id, {
			vehicle_ids: selectedVehicleIds.value,
		});
		ElMessage.success('车辆分配成功');
		vehicleDialogVisible.value = false;
		loadRoutes();
	} catch (error) {
		console.error('分配车辆失败:', error);
	} finally {
		assigningVehicles.value = false;
	}
};

// 移除已分配的车辆
const handleRemoveVehicle = async (route, vehicle) => {
	try {
		await ElMessageBox.confirm(
			`确定要将车辆「${vehicle.plate_number}」从线路「${route.code}」移除吗？`,
			'移除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await removeVehicleFromRoute(route.id, vehicle.id);
		ElMessage.success('已移除');
		loadRoutes();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('移除车辆失败:', error);
		}
	}
};

// 提交表单
const handleSubmit = async () => {
	if (!formRef.value) return;

	try {
		await formRef.value.validate();
		submitting.value = true;

		const payload = {
			code: form.code,
			name: form.name,
			origin: form.origin,
			destination: form.destination,
			distance_km: form.distance_km || null,
			active: form.active,
		};

		if (isEdit.value) {
			await updateRoute(form.id, payload);
			ElMessage.success('更新成功');
		} else {
			await createRoute(payload);
			ElMessage.success('创建成功');
		}

		dialogVisible.value = false;
		loadRoutes();
	} catch (error) {
		if (error !== false) {
			console.error('提交失败:', error);
		}
	} finally {
		submitting.value = false;
	}
};

// ========== 排班查询功能 ==========

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

// 获取排班状态标签类型
const getScheduleStatusTagType = (status) => {
	const map = {
		scheduled: 'info',
		running: 'warning',
		completed: 'success',
		cancelled: 'danger',
	};
	return map[status] || 'info';
};

// 获取排班状态文本
const getScheduleStatusText = (status) => {
	const map = {
		scheduled: '已计划',
		running: '运行中',
		completed: '已完成',
		cancelled: '已取消',
	};
	return map[status] || status;
};

// 打开排班查询对话框
const handleViewSchedules = async (row) => {
	currentRoute.value = row;
	scheduleDateRange.value = [];
	scheduleStatus.value = '';
	routeSchedules.value = [];
	scheduleDialogVisible.value = true;
	await loadRouteSchedules();
};

// 加载线路排班记录
const loadRouteSchedules = async () => {
	if (!currentRoute.value) return;
	
	schedulesLoading.value = true;
	try {
		const params = { include_details: true };
		if (scheduleStatus.value) {
			params.status = scheduleStatus.value;
		}
		if (scheduleDateRange.value && scheduleDateRange.value.length === 2) {
			params.start_date = scheduleDateRange.value[0];
			params.end_date = scheduleDateRange.value[1];
		}
		const data = await fetchRouteSchedules(currentRoute.value.id, params);
		routeSchedules.value = data || [];
	} catch (error) {
		console.error('获取排班记录失败:', error);
	} finally {
		schedulesLoading.value = false;
	}
};

// 页面加载时获取数据
onMounted(() => {
	loadRoutes();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
