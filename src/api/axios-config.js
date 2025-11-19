// 统一的 Axios 实例封装
// 后端基础地址：http://127.0.0.1:5000

import axios from 'axios';
import { ElMessage } from 'element-plus';

// 可以根据需要调整为 /api 前缀，看后端是否有蓝图前缀
// 这里先直接指向 Flask 服务根路径
const baseURL = 'http://127.0.0.1:5000/api';

const instance = axios.create({
	baseURL,
	timeout: 15000,
});

// 请求拦截器：统一加上 Authorization 头（如果有 token）
instance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('access_token');
		if (token) {
			config.headers = config.headers || {};
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// 响应拦截器：可以统一处理错误、401 等
instance.interceptors.response.use(
	(response) => response.data,
	(error) => {
		const { response } = error || {};

		if (response) {
			const msg =
				response.data?.message ||
				response.data?.error ||
				`请求错误：${response.status}`;

			// 全局错误提示
			ElMessage.error(msg);

			if (response.status === 401) {
				// 简单清理本地 token，后续可以在这里触发登出逻辑
				localStorage.removeItem('access_token');
			}
		} else {
			ElMessage.error('网络异常，请检查服务器或网络连接');
		}

		return Promise.reject(error);
	},
);

export default instance;

