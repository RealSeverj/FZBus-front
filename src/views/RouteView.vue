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
					v-model="searchKeyword"
					placeholder="搜索线路编号/名称/起终点/归属"
					clearable
					class="w-64"
					@clear="handleSearch"
					@keyup.enter="handleSearch"
				>
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
				<el-select
					v-model="filterActive"
					placeholder="线路状态"
					clearable
					class="w-32"
					@change="handleSearch"
				>
					<el-option label="全部" value="" />
					<el-option label="运营中" value="true" />
					<el-option label="已停运" value="false" />
				</el-select>
				<el-button type="primary" @click="handleSearch">
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
				:data="routes"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
				:default-sort="{ prop: 'id', order: 'ascending' }"
				@sort-change="handleSortChange"
			>
				<el-table-column prop="id" label="ID" width="70" align="center" sortable="custom" />
				<el-table-column prop="code" label="线路编号" width="100" sortable="custom">
					<template #default="{ row }">
						<span class="font-semibold text-primary">{{ row.code }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="name" label="线路名称" min-width="140" sortable="custom" />
				<el-table-column prop="origin" label="起点" min-width="120" sortable="custom">
					<template #default="{ row }">
						<el-icon class="text-green-500 mr-1"><LocationFilled /></el-icon>
						{{ row.origin }}
					</template>
				</el-table-column>
				<el-table-column prop="destination" label="终点" min-width="120" sortable="custom">
					<template #default="{ row }">
						<el-icon class="text-red-500 mr-1"><LocationFilled /></el-icon>
						{{ row.destination }}
					</template>
				</el-table-column>
				<el-table-column prop="fare_price" label="票价" width="100" align="center" sortable="custom">
					<template #default="{ row }">
						<span class="font-semibold">¥{{ row.fare_price ?? 2.0 }}</span>
						<span v-if="row.fare_discount && row.fare_discount < 1" class="text-xs text-orange-500 ml-1">
							({{ (row.fare_discount * 10).toFixed(0) }}折)
						</span>
					</template>
				</el-table-column>
				<el-table-column prop="monthly_pass_enabled" label="月票" width="80" align="center" sortable="custom">
					<template #default="{ row }">
						<el-tag :type="row.monthly_pass_enabled ? 'success' : 'info'" size="small">
							{{ row.monthly_pass_enabled ? '可用' : '不可用' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="ownership" label="归属" min-width="120" sortable="custom">
					<template #default="{ row }">
						<span v-if="row.ownership">{{ row.ownership }}</span>
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
				<el-table-column prop="active" label="状态" width="100" align="center" sortable="custom">
					<template #default="{ row }">
						<el-tag :type="row.active ? 'success' : 'danger'">
							{{ row.active ? '运营中' : '已停运' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="340" align="center" fixed="right">
					<template #default="{ row }">
						<el-button type="warning" link size="small" @click="handleViewRouteDetail(row)">
							<el-icon class="mr-1"><MapLocation /></el-icon>
							详情
						</el-button>
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
					@size-change="loadRoutes"
					@current-change="loadRoutes"
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
				<el-form-item label="票价" prop="fare_price">
					<el-input-number
						v-model="form.fare_price"
						:min="0"
						:max="100"
						:precision="2"
						placeholder="请输入票价"
						class="w-40"
					/>
					<span class="ml-2 text-gray-500">元</span>
				</el-form-item>
				<el-form-item label="票证折扣" prop="fare_discount">
					<el-input-number
						v-model="form.fare_discount"
						:min="0"
						:max="1"
						:step="0.1"
						:precision="2"
						placeholder="折扣比例"
						class="w-40"
					/>
					<span class="ml-2 text-gray-500 text-sm">0=无效, 0.9=九折, 1=不打折</span>
				</el-form-item>
				<el-form-item label="月票可用" prop="monthly_pass_enabled">
					<el-switch
						v-model="form.monthly_pass_enabled"
						active-text="可用"
						inactive-text="不可用"
						inline-prompt
					/>
				</el-form-item>
				<el-form-item label="线路归属" prop="ownership">
					<el-input
						v-model="form.ownership"
						placeholder="请输入线路归属，如公交公司名称"
						maxlength="100"
					/>
				</el-form-item>
				<el-form-item label="备注" prop="remarks">
					<el-input
						v-model="form.remarks"
						type="textarea"
						:rows="2"
						placeholder="请输入线路备注信息"
						maxlength="500"
					/>
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

		<!-- 线路详情对话框（地图展示） -->
		<el-dialog
			v-model="routeDetailDialogVisible"
			:title="`线路详情 - ${routeDetailData?.code || ''}`"
			width="1000px"
			destroy-on-close
			@close="handleCloseRouteDetail"
		>
			<RouteMapViewer
				:route="routeDetailData"
				:busstops="routeDetailBusstops"
				:polyline="routeDetailPolyline"
				:loading="routeDetailLoading"
			/>
			<template #footer>
				<div class="flex justify-end">
					<el-button @click="routeDetailDialogVisible = false">关闭</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, Edit, Delete, Van, LocationFilled, Calendar, MapLocation } from '@element-plus/icons-vue';
import {
	fetchRoutes,
	fetchRouteDetail,
	createRoute,
	updateRoute,
	deleteRoute,
	addVehiclesToRoute,
	removeVehicleFromRoute,
	fetchRouteSchedules,
} from '@/api/route';
import { fetchVehicles } from '@/api/vehicle';
import RouteMapViewer from '@/components/routes/RouteMapViewer.vue';

// 列表数据
const routes = ref([]);
const loading = ref(false);
const totalCount = ref(0);

// 搜索筛选
const searchKeyword = ref('');
const filterActive = ref('');

// 排序
const sortBy = ref('id');
const sortOrder = ref('asc');

// 分页
const currentPage = ref(1);
const pageSize = ref(20);

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

// 线路详情对话框（地图展示）
const routeDetailDialogVisible = ref(false);
const routeDetailData = ref(null);
const routeDetailBusstops = ref([]);
const routeDetailPolyline = ref('');
const routeDetailLoading = ref(false);

// 表单数据
const form = reactive({
	id: null,
	code: '',
	name: '',
	origin: '',
	destination: '',
	fare_price: 2.0,
	fare_discount: 1.0,
	monthly_pass_enabled: true,
	ownership: '',
	remarks: '',
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

// 计算可分配的车辆（排除已分配的）
const availableVehicles = computed(() => {
	if (!currentRoute.value) return allVehicles.value;
	const assignedIds = (currentRoute.value.vehicles || []).map(v => v.id);
	return allVehicles.value.filter(v => !assignedIds.includes(v.id) && v.in_service);
});

// 加载线路列表（后端分页）
const loadRoutes = async () => {
	loading.value = true;
	try {
		const params = {
			include_vehicles: true,
			page: currentPage.value,
			per_page: pageSize.value,
			sort_by: sortBy.value,
			order: sortOrder.value,
		};
		if (filterActive.value !== '') {
			params.active = filterActive.value;
		}
		if (searchKeyword.value.trim()) {
			params.keyword = searchKeyword.value.trim();
		}
		const data = await fetchRoutes(params);
		routes.value = data.items || [];
		totalCount.value = data.total || 0;
	} catch (error) {
		console.error('获取线路列表失败:', error);
		routes.value = [];
		totalCount.value = 0;
	} finally {
		loading.value = false;
	}
};

// 搜索（重置到第一页）
const handleSearch = () => {
	currentPage.value = 1;
	loadRoutes();
};

// 表格排序变化
const handleSortChange = ({ prop, order }) => {
	if (prop && order) {
		sortBy.value = prop;
		sortOrder.value = order === 'ascending' ? 'asc' : 'desc';
	} else {
		sortBy.value = 'id';
		sortOrder.value = 'asc';
	}
	currentPage.value = 1;
	loadRoutes();
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
	searchKeyword.value = '';
	filterActive.value = '';
	sortBy.value = 'id';
	sortOrder.value = 'asc';
	currentPage.value = 1;
	loadRoutes();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.code = '';
	form.name = '';
	form.origin = '';
	form.destination = '';
	form.fare_price = 2.0;
	form.fare_discount = 1.0;
	form.monthly_pass_enabled = true;
	form.ownership = '';
	form.remarks = '';
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
	form.fare_price = row.fare_price ?? 2.0;
	form.fare_discount = row.fare_discount ?? 1.0;
	form.monthly_pass_enabled = row.monthly_pass_enabled ?? true;
	form.ownership = row.ownership || '';
	form.remarks = row.remarks || '';
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
			fare_price: form.fare_price,
			fare_discount: form.fare_discount,
			monthly_pass_enabled: form.monthly_pass_enabled,
			ownership: form.ownership || null,
			remarks: form.remarks || null,
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

// ========== 线路详情查看功能 ==========

// 打开线路详情对话框（地图展示）
const handleViewRouteDetail = async (row) => {
	routeDetailDialogVisible.value = true;
	routeDetailLoading.value = true;
	routeDetailData.value = row;
	routeDetailBusstops.value = [];
	routeDetailPolyline.value = '';
	
	try {
		// 获取完整线路详情（包含站点和路径）
		const data = await fetchRouteDetail(row.id, {
			include_vehicles: true,
			include_busstops: true,
			include_polyline: true,
		});
		
		routeDetailData.value = data;
		routeDetailBusstops.value = data.busstops || [];
		routeDetailPolyline.value = data.polyline || '';
	} catch (error) {
		console.error('获取线路详情失败:', error);
		ElMessage.error('获取线路详情失败');
	} finally {
		routeDetailLoading.value = false;
	}
};

// 关闭线路详情对话框
const handleCloseRouteDetail = () => {
	routeDetailData.value = null;
	routeDetailBusstops.value = [];
	routeDetailPolyline.value = '';
};

// 页面加载时获取数据
onMounted(() => {
	loadRoutes();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
