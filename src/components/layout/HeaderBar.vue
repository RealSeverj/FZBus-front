
<template>
	<div class="flex h-16 items-center justify-between px-4">
		<div class="flex items-center gap-3">
			<el-icon class="text-xl text-primary">
				<Management />
			</el-icon>
			<div>
				<p class="text-base font-semibold leading-tight">FZBus 管理系统</p>
				<p class="text-xs text-gray-500">Fuzhou Bus Console</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<el-tooltip content="主题切换" placement="bottom">
				<el-button
					circle
					class="border-el-border text-el-text font-normal"
					@click="toggleTheme"
				>
					<el-icon v-if="isDark">
						<Moon />
					</el-icon>
					<el-icon v-else>
						<Sunny />
					</el-icon>
				</el-button>
			</el-tooltip>
			<el-button type="primary" plain class="gap-1" @click="handleLogout">
				<el-icon><SwitchButton /></el-icon>
				<span>退出登录</span>
			</el-button>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Management, Moon, Sunny, SwitchButton } from '@element-plus/icons-vue';
import { useTheme } from '../../store/theme';

const router = useRouter();
const { theme, toggleTheme } = useTheme();

const isDark = computed(() => theme.value === 'dark');

const handleLogout = () => {
	localStorage.removeItem('access_token');
	localStorage.removeItem('current_user');
	router.replace('/login');
};
</script>

<style scoped>
</style>

