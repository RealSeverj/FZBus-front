<template>
	<div class="min-h-screen flex items-center justify-center px-4">
		<div class="w-full max-w-md">
			<el-card class="shadow-lg !border-0 rounded-2xl overflow-hidden">
				<div class="py-6 px-6 sm:px-8">
					<div class="text-center mb-6">
						<h1 class="text-2xl font-semibold mb-1">福州公交管理系统</h1>
						<p class="text-xs text-gray-500">Fuzhou Bus Management Console</p>
					</div>
					<el-form label-position="top" @submit.prevent="onSubmit">
						<el-form-item label="用户名">
							<el-input
								v-model="form.username"
								placeholder="请输入用户名"
								autocomplete="username"
							/>
						</el-form-item>
						<el-form-item label="密码">
							<el-input
								v-model="form.password"
								type="password"
								show-password
								placeholder="请输入密码"
								autocomplete="current-password"
							/>
						</el-form-item>
						<el-form-item>
							<el-button
								type="primary"
								native-type="submit"
								class="w-full"
								:loading="loading"
								size="large"
							>
								登录
							</el-button>
						</el-form-item>
					</el-form>
				</div>
			</el-card>
		</div>
	</div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { loginApi } from '../api/auth';

const router = useRouter();
const route = useRoute();

const form = reactive({
	username: '',
	password: '',
});

const loading = ref(false);

const onSubmit = async () => {
	if (!form.username || !form.password) {
		ElMessage.error('请输入用户名和密码');
		return;
	}

	try {
		loading.value = true;
		const res = await loginApi({
			username: form.username,
			password: form.password,
		});

		const { access_token, user } = res || {};

		if (!access_token) {
			ElMessage.error('登录失败：未获取到 token');
			return;
		}

		localStorage.setItem('access_token', access_token);

		if (user) {
			localStorage.setItem('current_user', JSON.stringify(user));
		}

		ElMessage.success('登录成功');

		const redirect = route.query.redirect || '/';
		router.replace(redirect);
	} catch (error) {
		// 具体错误已在 axios 拦截器里通过 ElMessage.error 提示
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
</style>

