<template>
	<div class="p-6">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">用户管理</h1>
			<el-button type="primary" @click="handleAdd">
				<el-icon class="mr-1"><Plus /></el-icon>
				添加用户
			</el-button>
		</div>

		<!-- 搜索筛选栏 -->
		<el-card class="mb-6" shadow="never">
			<div class="flex flex-wrap gap-4 items-center">
				<el-input
					v-model="searchUsername"
					placeholder="搜索用户名"
					clearable
					class="w-48"
					@clear="handleSearch"
					@keyup.enter="handleSearch"
				>
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
				<el-select
					v-model="filterRole"
					placeholder="用户角色"
					clearable
					class="w-32"
					@change="handleSearch"
				>
					<el-option label="全部" value="" />
					<el-option label="管理员" value="admin" />
					<el-option label="普通用户" value="user" />
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
				:data="filteredUsers"
				stripe
				border
				class="w-full"
				:header-cell-style="{ fontWeight: 'bold' }"
			>
				<el-table-column prop="id" label="ID" width="80" align="center" />
				<el-table-column prop="username" label="用户名" min-width="150" />
				<el-table-column prop="is_admin" label="角色" width="120" align="center">
					<template #default="{ row }">
						<el-tag :type="getRoleTagType(row)">
							{{ getUserRole(row) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="created_at" label="创建时间" min-width="180">
					<template #default="{ row }">
						{{ formatDateTime(row.created_at) }}
					</template>
				</el-table-column>
				<el-table-column label="操作" width="160" align="center" fixed="right">
					<template #default="{ row }">
						<el-button
							type="primary"
							link
							size="small"
							:disabled="!canEditUser(row)"
							@click="handleEdit(row)"
						>
							<el-icon class="mr-1"><Edit /></el-icon>
							编辑
						</el-button>
						<el-button
							type="danger"
							link
							size="small"
							:disabled="row.username === getCurrentUser()?.username"
							@click="handleDelete(row)"
						>
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

		<!-- 新增/编辑用户对话框 -->
		<el-dialog
			v-model="dialogVisible"
			:title="isEdit ? '编辑用户' : '添加用户'"
			width="500px"
			destroy-on-close
			@close="resetForm"
		>
			<el-form
				ref="formRef"
				:model="form"
				:rules="isEdit ? {} : rules"
				label-width="80px"
				class="px-4"
			>
				<el-form-item label="用户名" prop="username">
					<el-input
						v-model="form.username"
						placeholder="请输入用户名"
						maxlength="80"
						:disabled="isEdit && form.username === 'admin'"
					/>
					<div v-if="isEdit && form.username === 'admin'" class="text-xs text-gray-400 mt-1">
						admin 用户名不可更改
					</div>
				</el-form-item>
				<el-form-item label="密码" prop="password">
					<el-input
						v-model="form.password"
						type="password"
						:placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
						show-password
					/>
				</el-form-item>
				<el-form-item label="确认密码" prop="confirmPassword">
					<el-input
						v-model="form.confirmPassword"
						type="password"
						:placeholder="isEdit ? '留空则不修改密码' : '请再次输入密码'"
						show-password
					/>
				</el-form-item>
				<el-form-item label="角色" prop="is_admin">
					<el-radio-group v-model="form.is_admin" :disabled="isEdit && form.username === 'admin'">
						<el-radio :value="false">普通用户</el-radio>
						<el-radio :value="true" :disabled="!isSuperAdmin">
							管理员
							<span v-if="!isSuperAdmin" class="text-gray-400 text-xs ml-1">
								(仅超级管理员可操作)
							</span>
						</el-radio>
					</el-radio-group>
					<div v-if="isEdit && form.username === 'admin'" class="text-xs text-gray-400 mt-1">
						超级管理员角色不可更改
					</div>
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
import { Plus, Search, Refresh, Delete, Edit } from '@element-plus/icons-vue';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/api/user';

// 用户列表数据
const users = ref([]);
const loading = ref(false);

// 获取当前登录用户信息
const getCurrentUser = () => {
	const token = localStorage.getItem('access_token');
	if (!token) return null;
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload;
	} catch {
		return null;
	}
};

// 判断是否为超级管理员
const isSuperAdmin = computed(() => {
	const user = getCurrentUser();
	return user?.username === 'admin';
});

// 搜索筛选
const searchUsername = ref('');
const filterRole = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingUserId = ref(null);
const submitting = ref(false);
const formRef = ref(null);

// 表单数据
const form = reactive({
	username: '',
	password: '',
	confirmPassword: '',
	is_admin: false,
});

// 确认密码校验
const validateConfirmPassword = (rule, value, callback) => {
	if (value !== form.password) {
		callback(new Error('两次输入的密码不一致'));
	} else {
		callback();
	}
};

// 表单校验规则
const rules = {
	username: [
		{ required: true, message: '请输入用户名', trigger: 'blur' },
		{ min: 2, max: 80, message: '用户名长度在 2 到 80 个字符', trigger: 'blur' },
	],
	password: [
		{ required: true, message: '请输入密码', trigger: 'blur' },
		{ min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' },
	],
	confirmPassword: [
		{ required: true, message: '请确认密码', trigger: 'blur' },
		{ validator: validateConfirmPassword, trigger: 'blur' },
	],
};

// 计算过滤后的用户列表
const filteredUsers = computed(() => {
	let result = users.value;

	// 按用户名搜索
	if (searchUsername.value) {
		result = result.filter((u) =>
			u.username.toLowerCase().includes(searchUsername.value.toLowerCase()),
		);
	}

	// 按角色筛选
	if (filterRole.value) {
		if (filterRole.value === 'admin') {
			result = result.filter((u) => u.is_admin);
		} else {
			result = result.filter((u) => !u.is_admin);
		}
	}

	return result;
});

// 计算总数
const totalCount = computed(() => filteredUsers.value.length);

// 获取用户角色显示文本
const getUserRole = (user) => {
	if (user.username === 'admin') return '超级管理员';
	if (user.is_admin) return '管理员';
	return '普通用户';
};

// 获取用户角色标签类型
const getRoleTagType = (user) => {
	if (user.username === 'admin') return 'danger';
	if (user.is_admin) return 'warning';
	return 'info';
};

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

// 搜索
const handleSearch = () => {
	currentPage.value = 1;
};

// 重置筛选条件
const resetFilters = () => {
	searchUsername.value = '';
	filterRole.value = '';
};

// 重置表单
const resetForm = () => {
	form.username = '';
	form.password = '';
	form.confirmPassword = '';
	form.is_admin = false;
	isEdit.value = false;
	editingUserId.value = null;
	formRef.value?.resetFields();
};

// 添加用户
const handleAdd = () => {
	resetForm();
	isEdit.value = false;
	dialogVisible.value = true;
};

// 编辑用户
const handleEdit = (row) => {
	resetForm();
	isEdit.value = true;
	editingUserId.value = row.id;
	form.username = row.username;
	form.is_admin = row.is_admin;
	// 密码字段留空，只有填写时才更新
	form.password = '';
	form.confirmPassword = '';
	dialogVisible.value = true;
};

// 判断当前用户是否可以编辑目标用户
const canEditUser = (row) => {
	const currentUser = getCurrentUser();
	if (!currentUser) return false;
	
	// 超级管理员可以编辑所有人
	if (currentUser.username === 'admin') return true;
	
	// 普通管理员可以编辑普通用户和自己
	if (currentUser.is_admin) {
		return !row.is_admin || row.id === parseInt(currentUser.sub);
	}
	
	// 普通用户只能编辑自己
	return row.id === parseInt(currentUser.sub);
};

// 提交表单
const handleSubmit = async () => {
	if (!formRef.value) return;

	try {
		// 编辑模式下，密码非必填
		if (isEdit.value) {
			// 手动验证必填字段
			if (!form.username) {
				ElMessage.warning('请输入用户名');
				return;
			}
			// 如果填了密码，需要验证确认密码
			if (form.password && form.password !== form.confirmPassword) {
				ElMessage.warning('两次输入的密码不一致');
				return;
			}
		} else {
			await formRef.value.validate();
		}
		
		submitting.value = true;

		if (isEdit.value) {
			// 编辑模式
			const payload = {};
			
			// 只有修改了才提交
			if (form.username) {
				payload.username = form.username;
			}
			if (form.password) {
				payload.password = form.password;
			}
			// 角色变更（只有超级管理员可以操作）
			if (isSuperAdmin.value) {
				payload.is_admin = form.is_admin;
			}
			
			await updateUser(editingUserId.value, payload);
			ElMessage.success('用户更新成功');
		} else {
			// 创建模式
			const payload = {
				username: form.username,
				password: form.password,
				is_admin: form.is_admin,
			};
			await createUser(payload);
			ElMessage.success('用户创建成功');
		}

		dialogVisible.value = false;
		loadUsers();
	} catch (error) {
		if (error !== false) {
			console.error(isEdit.value ? '更新用户失败:' : '创建用户失败:', error);
		}
	} finally {
		submitting.value = false;
	}
};

// 加载用户列表
const loadUsers = async () => {
	loading.value = true;
	try {
		const data = await fetchUsers();
		users.value = data?.users || [];
	} catch (error) {
		console.error('获取用户列表失败:', error);
	} finally {
		loading.value = false;
	}
};

// 删除用户
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			`确定要删除用户「${row.username}」吗？此操作不可恢复。`,
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteUser(row.id);
		ElMessage.success('删除成功');
		loadUsers();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除用户失败:', error);
		}
	}
};

// 页面加载
onMounted(() => {
	loadUsers();
});
</script>

<style scoped>
/* 自定义样式 */
</style>
