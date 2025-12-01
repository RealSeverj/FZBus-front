// 用户状态管理
import { ref, computed } from 'vue';

// 用户信息响应式状态
const currentUser = ref(null);

// 从 JWT token 中解析用户信息
const parseUserFromToken = () => {
	const token = localStorage.getItem('access_token');
	if (!token) return null;
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload;
	} catch {
		return null;
	}
};

// 初始化用户信息
const initUser = () => {
	const user = parseUserFromToken();
	currentUser.value = user;
	return user;
};

// 设置用户信息（登录后调用）
const setUser = (user) => {
	currentUser.value = user;
};

// 清除用户信息（登出时调用）
const clearUser = () => {
	currentUser.value = null;
	localStorage.removeItem('access_token');
	localStorage.removeItem('current_user');
};

// 计算属性
const username = computed(() => currentUser.value?.username || '');
const isAdmin = computed(() => currentUser.value?.is_admin || false);
const isSuperAdmin = computed(() => currentUser.value?.username === 'admin');
const isLoggedIn = computed(() => !!currentUser.value);

// 导出 composable
export function useUser() {
	return {
		currentUser,
		username,
		isAdmin,
		isSuperAdmin,
		isLoggedIn,
		initUser,
		setUser,
		clearUser,
		parseUserFromToken,
	};
}
