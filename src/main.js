import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);

// 全局注册 Element Plus 组件库
app.use(ElementPlus);

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component);
}

app.use(router);

app.mount('#app');
