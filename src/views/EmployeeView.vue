<template>
	<div class="p-6">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold ">员工管理</h1>
			<el-button type="primary" @click="handleAdd">
				<el-icon class="mr-1"><Plus /></el-icon>
				添加员工
			</el-button>
		</div>

		<!-- 搜索筛选栏 -->
		<el-card class="mb-6" shadow="never">
			<div class="flex flex-wrap gap-4 items-center">
				<el-input
					v-model="searchName"
					placeholder="搜索员工姓名"
					clearable
					class="w-48"
					@clear="loadEmployees"
					@keyup.enter="loadEmployees"
				>
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
				<el-select
					v-model="filterActive"
					placeholder="在职状态"
					clearable
					class="w-32"
					@change="loadEmployees"
				>
					<el-option label="全部" value="" />
					<el-option label="在职" value="true" />
					<el-option label="离职" value="false" />
				</el-select>
				<el-select
					v-model="filterRole"
					placeholder="职位筛选"
					clearable
					class="w-32"
					@change="loadEmployees"
				>
					<el-option label="全部" value="" />
					<el-option label="司机" value="司机" />
					<el-option label="调度" value="调度" />
					<el-option label="售票员" value="售票员" />
					<el-option label="维修工" value="维修工" />
				</el-select>
				<el-button type="primary" @click="loadEmployees">
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
				:data="filteredEmployees"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
			>
				<el-table-column prop="id" label="ID" width="80" align="center" />
				<el-table-column prop="name" label="姓名" min-width="120" />
				<el-table-column prop="role" label="职位" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="getRoleTagType(row.role)">{{ row.role }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="phone" label="联系电话" min-width="140">
					<template #default="{ row }">
						{{ row.phone || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="hire_date" label="入职日期" width="120" align="center">
					<template #default="{ row }">
						{{ row.hire_date || '-' }}
					</template>
				</el-table-column>
				<el-table-column prop="active" label="状态" width="100" align="center">
					<template #default="{ row }">
						<el-tag :type="row.active ? 'success' : 'danger'">
							{{ row.active ? '在职' : '离职' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="260" align="center" fixed="right">
					<template #default="{ row }">
						<el-button type="info" link size="small" @click="handleViewSchedules(row)">
							<el-icon class="mr-1"><Calendar /></el-icon>
							排班
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
			:title="isEdit ? '编辑员工' : '添加员工'"
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
				<el-form-item label="姓名" prop="name">
					<el-input v-model="form.name" placeholder="请输入员工姓名" maxlength="50" />
				</el-form-item>
				<el-form-item label="职位" prop="role">
					<el-select v-model="form.role" placeholder="请选择职位" class="w-full">
						<el-option label="司机" value="司机" />
						<el-option label="调度" value="调度" />
						<el-option label="售票员" value="售票员" />
						<el-option label="维修工" value="维修工" />
					</el-select>
				</el-form-item>
				<el-form-item label="电话" prop="phone">
					<el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="20" />
				</el-form-item>
				<el-form-item label="状态" prop="active">
					<el-switch
						v-model="form.active"
						active-text="在职"
						inactive-text="离职"
						inline-prompt
					/>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<el-button @click="dialogVisible = false">取消</el-button>
					<el-button type="primary" :loading="submitting" @click="handleSubmit">
						{{ isEdit ? '更新' : '创建' }}
					</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 排班查询对话框 -->
		<el-dialog
			v-model="scheduleDialogVisible"
			title="员工排班记录"
			width="900px"
			destroy-on-close
		>
			<div class="mb-4">
				<p class="text-sm text-gray-500 mb-2">
					当前员工：<span class="font-semibold text-primary">{{ currentEmployee?.name }}</span>
					<el-tag size="small" class="ml-2">{{ currentEmployee?.role }}</el-tag>
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
					@change="loadEmployeeSchedules"
				/>
				<el-select
					v-model="scheduleStatus"
					placeholder="班次状态"
					clearable
					class="w-32"
					@change="loadEmployeeSchedules"
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
				:data="employeeSchedules"
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
				<el-table-column prop="vehicle" label="车辆" width="120">
					<template #default="{ row }">
						<span v-if="row.vehicle">{{ row.vehicle.plate_number }}</span>
						<span v-else class="text-gray-400">ID: {{ row.vehicle_id }}</span>
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
import { Plus, Search, Refresh, Edit, Delete, Calendar } from '@element-plus/icons-vue';
import {
	fetchEmployees,
	createEmployee,
	updateEmployee,
	deleteEmployee,
	fetchEmployeeSchedules,
} from '@/api/employee';

// 列表数据
const employees = ref([]);
const loading = ref(false);

// 搜索筛选
const searchName = ref('');
const filterActive = ref('');
const filterRole = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref(null);

// 排班查询对话框
const scheduleDialogVisible = ref(false);
const currentEmployee = ref(null);
const employeeSchedules = ref([]);
const schedulesLoading = ref(false);
const scheduleDateRange = ref([]);
const scheduleStatus = ref('');

// 表单数据
const form = reactive({
	id: null,
	name: '',
	role: '',
	phone: '',
	active: true,
});

// 表单校验规则
const rules = {
	name: [
		{ required: true, message: '请输入员工姓名', trigger: 'blur' },
		{ min: 2, max: 50, message: '姓名长度在 2 到 50 个字符', trigger: 'blur' },
	],
	role: [{ required: true, message: '请选择职位', trigger: 'change' }],
	phone: [
		{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
	],
};

// 计算过滤后的员工列表
const filteredEmployees = computed(() => {
	let result = employees.value;

	// 按姓名搜索
	if (searchName.value) {
		result = result.filter((e) =>
			e.name.toLowerCase().includes(searchName.value.toLowerCase()),
		);
	}

	// 按职位筛选
	if (filterRole.value) {
		result = result.filter((e) => e.role === filterRole.value);
	}

	return result;
});

// 计算总数
const totalCount = computed(() => filteredEmployees.value.length);

// 获取职位标签类型
const getRoleTagType = (role) => {
	const typeMap = {
		司机: 'primary',
		调度: 'success',
		售票员: 'warning',
		维修工: 'info',
	};
	return typeMap[role] || 'default';
};

// 加载员工列表
const loadEmployees = async () => {
	loading.value = true;
	try {
		const params = {};
		if (filterActive.value !== '') {
			params.active = filterActive.value;
		}
		const data = await fetchEmployees(params);
		employees.value = data || [];
	} catch (error) {
		console.error('获取员工列表失败:', error);
	} finally {
		loading.value = false;
	}
};

// 重置筛选条件
const resetFilters = () => {
	searchName.value = '';
	filterActive.value = '';
	filterRole.value = '';
	loadEmployees();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.name = '';
	form.role = '';
	form.phone = '';
	form.active = true;
	formRef.value?.resetFields();
};

// 添加员工
const handleAdd = () => {
	isEdit.value = false;
	resetForm();
	dialogVisible.value = true;
};

// 编辑员工
const handleEdit = (row) => {
	isEdit.value = true;
	form.id = row.id;
	form.name = row.name;
	form.role = row.role;
	form.phone = row.phone || '';
	form.active = row.active;
	dialogVisible.value = true;
};

// 删除员工
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			`确定要删除员工「${row.name}」吗？此操作不可恢复。`,
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteEmployee(row.id);
		ElMessage.success('删除成功');
		loadEmployees();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除员工失败:', error);
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
			name: form.name,
			role: form.role,
			phone: form.phone || null,
			active: form.active,
		};

		if (isEdit.value) {
			await updateEmployee(form.id, payload);
			ElMessage.success('更新成功');
		} else {
			await createEmployee(payload);
			ElMessage.success('创建成功');
		}

		dialogVisible.value = false;
		loadEmployees();
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
	currentEmployee.value = row;
	scheduleDateRange.value = [];
	scheduleStatus.value = '';
	employeeSchedules.value = [];
	scheduleDialogVisible.value = true;
	await loadEmployeeSchedules();
};

// 加载员工排班记录
const loadEmployeeSchedules = async () => {
	if (!currentEmployee.value) return;
	
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
		const data = await fetchEmployeeSchedules(currentEmployee.value.id, params);
		employeeSchedules.value = data || [];
	} catch (error) {
		console.error('获取排班记录失败:', error);
	} finally {
		schedulesLoading.value = false;
	}
};

// 页面加载时获取数据
onMounted(() => {
	loadEmployees();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
