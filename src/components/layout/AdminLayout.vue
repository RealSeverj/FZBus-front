<template>
	<el-container class="h-screen">
		<el-aside width="220px">
			<SideMenu />
		</el-aside>
		<el-container>
			<el-header>
				<HeaderBar />
			</el-header>
			<el-main class="p-4">
				<router-view />
			</el-main>
		</el-container>
	</el-container>
</template>

<script setup>
import HeaderBar from './HeaderBar.vue';
import SideMenu from './SideMenu.vue';
</script>

<style scoped>
</style>

