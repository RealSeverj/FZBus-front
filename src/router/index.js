import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import VehicleView from '../views/VehicleView.vue';
import EmployeeView from '../views/EmployeeView.vue';
import RouteView from '../views/RouteView.vue';
import ScheduleView from '../views/ScheduleView.vue';
import UserView from '../views/UserView.vue';
import LoginPage from '../views/LoginPage.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/vehicles',
    name: 'Vehicles',
    component: VehicleView,
    meta: { requiresAuth: true },
  },
  {
    path: '/employees',
    name: 'Employees',
    component: EmployeeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/routes',
    name: 'Routes',
    component: RouteView,
    meta: { requiresAuth: true },
  },
  {
    path: '/schedules',
    name: 'Schedules',
    component: ScheduleView,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: UserView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫：未登录统一跳转到 /login
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token');

  if (to.path === '/login') {
    // 已登录时访问登录页，直接跳首页
    if (token) {
      next('/');
    } else {
      next();
    }
    return;
  }

  const requiresAuth = to.meta.requiresAuth !== false;

  if (requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;
