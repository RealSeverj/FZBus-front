<template>
	<div class="p-6">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">车辆管理</h1>
			<el-button type="primary" @click="handleAdd">
				<el-icon class="mr-1"><Plus /></el-icon>
				添加车辆
			</el-button>
		</div>

		<!-- 搜索筛选栏 -->
		<el-card class="mb-6" shadow="never">
			<div class="flex flex-wrap gap-4 items-center">
				<el-input
					v-model="searchPlate"
					placeholder="搜索车牌号"
					clearable
					class="w-48"
					@clear="loadVehicles"
					@keyup.enter="loadVehicles"
				>
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
				<el-select
					v-model="filterInService"
					placeholder="服务状态"
					clearable
					class="w-32"
					@change="loadVehicles"
				>
					<el-option label="全部" value="" />
					<el-option label="运营中" value="true" />
					<el-option label="已停运" value="false" />
				</el-select>
				<el-select
					v-model="filterUnassigned"
					placeholder="线路分配"
					clearable
					class="w-36"
					@change="loadVehicles"
				>
					<el-option label="全部" value="" />
					<el-option label="未分配线路" value="true" />
				</el-select>
				<el-input
					v-model="searchModel"
					placeholder="搜索车型"
					clearable
					class="w-40"
					@clear="loadVehicles"
					@keyup.enter="loadVehicles"
				/>
				<el-button type="primary" @click="loadVehicles">
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
				:data="filteredVehicles"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
			>
				<el-table-column prop="id" label="ID" width="80" align="center" />
				<el-table-column prop="plate_number" label="车牌号" min-width="120">
					<template #default="{ row }">
						<span class="font-semibold text-primary">{{ row.plate_number }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="model" label="车型" min-width="100">
					<template #default="{ row }">
						{{ row.model || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="capacity" label="载客量" width="90" align="center">
					<template #default="{ row }">
						<el-tag type="info">{{ row.capacity }} 人</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="routes" label="分配线路" min-width="200">
					<template #default="{ row }">
						<div v-if="row.routes && row.routes.length > 0" class="flex flex-wrap gap-1">
							<el-tag
								v-for="route in row.routes"
								:key="route.id"
								type="primary"
								size="small"
								closable
								@close="handleRemoveRoute(row, route)"
							>
								{{ route.code }} - {{ route.name }}
							</el-tag>
						</div>
						<span v-else class="text-gray-400">未分配</span>
					</template>
				</el-table-column>
				<el-table-column prop="in_service" label="状态" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="row.in_service ? 'success' : 'danger'">
							{{ row.in_service ? '运营中' : '已停运' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="280" align="center" fixed="right">
					<template #default="{ row }">
						<el-button type="info" link size="small" @click="handleViewSchedules(row)">
							<el-icon class="mr-1"><Calendar /></el-icon>
							排班
						</el-button>
						<el-button type="success" link size="small" @click="handleAssignRoute(row)">
							<el-icon class="mr-1"><Connection /></el-icon>
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
			:title="isEdit ? '编辑车辆' : '添加车辆'"
			width="500px"
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
				<el-form-item label="车牌号" prop="plate_number">
					<el-input
						v-model="form.plate_number"
						placeholder="请输入车牌号，如：闽A12345"
						maxlength="20"
					/>
				</el-form-item>
				<el-form-item label="车型" prop="model">
					<el-input
						v-model="form.model"
						placeholder="请输入车型，如：宇通E12"
						maxlength="50"
					/>
				</el-form-item>
				<el-form-item label="载客量" prop="capacity">
					<el-input-number
						v-model="form.capacity"
						:min="1"
						:max="200"
						placeholder="请输入载客量"
						class="w-full"
					/>
				</el-form-item>
				<el-form-item label="状态" prop="in_service">
					<el-switch
						v-model="form.in_service"
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

		<!-- 分配线路对话框 -->
		<el-dialog
			v-model="routeDialogVisible"
			title="分配线路"
			width="600px"
			destroy-on-close
		>
			<div class="mb-4">
				<p class="text-sm text-gray-500 mb-2">
					当前车辆：<span class="font-semibold text-primary">{{ currentVehicle?.plate_number }}</span>
				</p>
				<p class="text-sm text-gray-500">
					已分配线路：
					<span v-if="currentVehicle?.routes?.length">
						{{ currentVehicle.routes.map(r => r.code).join('、') }}
					</span>
					<span v-else class="text-gray-400">无</span>
				</p>
			</div>
			<el-divider />
			<el-form label-width="80px">
				<el-form-item label="选择线路">
					<el-select
						v-model="selectedRouteIds"
						multiple
						filterable
						placeholder="请选择要分配的线路"
						class="w-full"
						:loading="routesLoading"
					>
						<el-option
							v-for="route in availableRoutes"
							:key="route.id"
							:label="`${route.code} - ${route.name}`"
							:value="route.id"
						>
							<div class="flex justify-between items-center">
								<span>{{ route.code }} - {{ route.name }}</span>
								<span class="text-xs text-gray-400">
									{{ route.origin }} → {{ route.destination }}
								</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<el-button @click="routeDialogVisible = false">取消</el-button>
					<el-button
						type="primary"
						:loading="assigningRoutes"
						:disabled="selectedRouteIds.length === 0"
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
			title="车辆排班记录"
			width="900px"
			destroy-on-close
		>
			<div class="mb-4">
				<p class="text-sm text-gray-500 mb-2">
					当前车辆：<span class="font-semibold text-primary">{{ currentVehicle?.plate_number }}</span>
					<span class="text-gray-400 ml-2">{{ currentVehicle?.model }}</span>
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
					@change="loadVehicleSchedules"
				/>
				<el-select
					v-model="scheduleStatus"
					placeholder="班次状态"
					clearable
					class="w-32"
					@change="loadVehicleSchedules"
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
				:data="vehicleSchedules"
				stripe
				border
				max-height="400"
			>
				<el-table-column prop="id" label="ID" width="70" align="center" />
				<el-table-column prop="route" label="线路" min-width="140">
					<template #default="{ row }">
						<span v-if="row.route" class="font-semibold">{{ row.route.code }} - {{ row.route.name }}</span>
						<span v-else class="text-gray-400">ID: {{ row.route_id }}</span>
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
import { Plus, Search, Refresh, Edit, Delete, Connection, Calendar } from '@element-plus/icons-vue';
import {
	fetchVehicles,
	createVehicle,
	updateVehicle,
	deleteVehicle,
	assignVehicleToRoutes,
	removeVehicleFromRoute,
	fetchVehicleSchedules,
} from '@/api/vehicle';
import { fetchRoutes } from '@/api/route';

// 列表数据
const vehicles = ref([]);
const loading = ref(false);

// 搜索筛选
const searchPlate = ref('');
const searchModel = ref('');
const filterInService = ref('');
const filterUnassigned = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref(null);

// 线路分配对话框
const routeDialogVisible = ref(false);
const currentVehicle = ref(null);
const allRoutes = ref([]);
const selectedRouteIds = ref([]);
const routesLoading = ref(false);
const assigningRoutes = ref(false);

// 排班查询对话框
const scheduleDialogVisible = ref(false);
const vehicleSchedules = ref([]);
const schedulesLoading = ref(false);
const scheduleDateRange = ref([]);
const scheduleStatus = ref('');

// 表单数据
const form = reactive({
	id: null,
	plate_number: '',
	model: '',
	capacity: 40,
	in_service: true,
});

// 表单校验规则
const rules = {
	plate_number: [
		{ required: true, message: '请输入车牌号', trigger: 'blur' },
		{ min: 2, max: 20, message: '车牌号长度在 2 到 20 个字符', trigger: 'blur' },
	],
	capacity: [
		{ required: true, message: '请输入载客量', trigger: 'blur' },
	],
};

// 计算过滤后的车辆列表
const filteredVehicles = computed(() => {
	let result = vehicles.value;

	// 按车牌号搜索
	if (searchPlate.value) {
		result = result.filter((v) =>
			v.plate_number.toLowerCase().includes(searchPlate.value.toLowerCase()),
		);
	}

	// 按车型搜索
	if (searchModel.value) {
		result = result.filter((v) =>
			v.model?.toLowerCase().includes(searchModel.value.toLowerCase()),
		);
	}

	return result;
});

// 计算可分配的线路（排除已分配的）
const availableRoutes = computed(() => {
	if (!currentVehicle.value) return allRoutes.value;
	const assignedIds = (currentVehicle.value.routes || []).map(r => r.id);
	return allRoutes.value.filter(r => !assignedIds.includes(r.id) && r.active);
});

// 计算总数
const totalCount = computed(() => filteredVehicles.value.length);

// 格式化日期时间
const formatDateTime = (isoString) => {
	if (!isoString) return '-';
	const date = new Date(isoString);
	return date.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

// 加载车辆列表
const loadVehicles = async () => {
	loading.value = true;
	try {
		const params = { include_routes: true };
		if (filterInService.value !== '') {
			params.in_service = filterInService.value;
		}
		if (filterUnassigned.value === 'true') {
			params.unassigned = 'true';
		}
		const data = await fetchVehicles(params);
		vehicles.value = data || [];
	} catch (error) {
		console.error('获取车辆列表失败:', error);
	} finally {
		loading.value = false;
	}
};

// 加载所有线路
const loadRoutes = async () => {
	routesLoading.value = true;
	try {
		const data = await fetchRoutes();
		allRoutes.value = data || [];
	} catch (error) {
		console.error('获取线路列表失败:', error);
	} finally {
		routesLoading.value = false;
	}
};

// 重置筛选条件
const resetFilters = () => {
	searchPlate.value = '';
	searchModel.value = '';
	filterInService.value = '';
	filterUnassigned.value = '';
	loadVehicles();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.plate_number = '';
	form.model = '';
	form.capacity = 40;
	form.in_service = true;
	isEdit.value = false;
	formRef.value?.resetFields();
};

// 添加车辆
const handleAdd = () => {
	resetForm();
	isEdit.value = false;
	dialogVisible.value = true;
};

// 编辑车辆
const handleEdit = (row) => {
	resetForm();
	isEdit.value = true;
	form.id = row.id;
	form.plate_number = row.plate_number;
	form.model = row.model || '';
	form.capacity = row.capacity;
	form.in_service = row.in_service;
	dialogVisible.value = true;
};

// 删除车辆
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			`确定要删除车辆「${row.plate_number}」吗？此操作不可恢复。`,
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteVehicle(row.id);
		ElMessage.success('删除成功');
		loadVehicles();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除车辆失败:', error);
		}
	}
};

// 打开分配线路对话框
const handleAssignRoute = async (row) => {
	currentVehicle.value = row;
	selectedRouteIds.value = [];
	routeDialogVisible.value = true;
	await loadRoutes();
};

// 确认分配线路
const handleConfirmAssign = async () => {
	if (selectedRouteIds.value.length === 0) return;
	
	assigningRoutes.value = true;
	try {
		await assignVehicleToRoutes(currentVehicle.value.id, {
			route_ids: selectedRouteIds.value,
		});
		ElMessage.success('线路分配成功');
		routeDialogVisible.value = false;
		loadVehicles();
	} catch (error) {
		console.error('分配线路失败:', error);
	} finally {
		assigningRoutes.value = false;
	}
};

// 移除已分配的线路
const handleRemoveRoute = async (vehicle, route) => {
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

		await removeVehicleFromRoute(vehicle.id, route.id);
		ElMessage.success('已移除');
		loadVehicles();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('移除线路失败:', error);
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
			plate_number: form.plate_number,
			model: form.model || null,
			capacity: form.capacity,
			in_service: form.in_service,
		};

		if (isEdit.value) {
			await updateVehicle(form.id, payload);
			ElMessage.success('更新成功');
		} else {
			await createVehicle(payload);
			ElMessage.success('创建成功');
		}

		dialogVisible.value = false;
		loadVehicles();
	} catch (error) {
		if (error !== false) {
			console.error('提交失败:', error);
		}
	} finally {
		submitting.value = false;
	}
};

// ========== 排班查询功能 ==========

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
	currentVehicle.value = row;
	scheduleDateRange.value = [];
	scheduleStatus.value = '';
	vehicleSchedules.value = [];
	scheduleDialogVisible.value = true;
	await loadVehicleSchedules();
};

// 加载车辆排班记录
const loadVehicleSchedules = async () => {
	if (!currentVehicle.value) return;
	
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
		const data = await fetchVehicleSchedules(currentVehicle.value.id, params);
		vehicleSchedules.value = data || [];
	} catch (error) {
		console.error('获取排班记录失败:', error);
	} finally {
		schedulesLoading.value = false;
	}
};

// 页面加载时获取数据
onMounted(() => {
	loadVehicles();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
