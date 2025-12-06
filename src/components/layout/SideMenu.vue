<template>
	<el-menu
		class="h-full border-none"
		:default-active="activeMenu"
		router
		unique-opened
	>
		<el-menu-item index="/">
			<el-icon><House /></el-icon>
			<span>首页</span>
		</el-menu-item>
		<el-menu-item index="/employees">
			<el-icon><User /></el-icon>
			<span>员工管理</span>
		</el-menu-item>
		<el-menu-item index="/routes">
			<el-icon><Guide /></el-icon>
			<span>线路管理</span>
		</el-menu-item>
		<el-menu-item index="/busstops">
			<el-icon><Location /></el-icon>
			<span>站点管理</span>
		</el-menu-item>
		<el-menu-item index="/schedules">
			<el-icon><Timer /></el-icon>
			<span>班次管理</span>
		</el-menu-item>
		<el-menu-item index="/vehicles">
			<el-icon><Van /></el-icon>
			<span>车辆管理</span>
		</el-menu-item>
		<el-menu-item index="/users">
			<el-icon><UserFilled /></el-icon>
			<span>用户管理</span>
		</el-menu-item>
	</el-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { House, User, Guide, Timer, Van, UserFilled, Location } from '@element-plus/icons-vue';

const route = useRoute();

const activeMenu = computed(() => route.path);
</script>

