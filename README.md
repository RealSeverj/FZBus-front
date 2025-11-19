已创建 5 个待办事项

先整理一下：你已经有后端模型和 REST 接口，前端是 Vite + Vue，接下来这一步我们先把整个“福州公交管理系统”的前端+整体架构设计清晰（不用写具体代码）。

---

## 1. 后端能力梳理（驱动前端的功能）

根据你给的模型和 routes，可以抽象出这些业务模块：

1. **车辆管理（Vehicle）**
   - 列表：`GET /vehicles?in_service=true|false`
   - 详情：`GET /vehicles/<id>`
   - 新增：`POST /vehicles`
   - 编辑：`PUT /vehicles/<id>`
   - 删除：`DELETE /vehicles/<id>`
   - 字段：车牌号、座位数、车型、是否在运营、创建时间

2. **员工管理（Employee）**
   - 列表：`GET /employees?active=true|false`
   - 详情：`GET /employees/<id>`
   - 新增：`POST /employees`
   - 编辑：`PUT /employees/<id>`
   - 删除：`DELETE /employees/<id>`
   - 字段：姓名、角色（司机/调度等）、电话、入职日期、是否在职

3. **线路管理（Route）**
   - 列表：`GET /routes?active=true|false`
   - 详情：`GET /routes/<id>`
   - 新增：`POST /routes`
   - 编辑：`PUT /routes/<id>`
   - 删除：`DELETE /routes/<id>`
   - 字段：线路编码、线路名称、起点、终点、距离、是否启用

4. **班次/调度管理（Schedule）**
   - 列表：`GET /schedules?status=scheduled|running|...`
   - 详情：`GET /schedules/<id>`
   - 新增：`POST /schedules`
   - 编辑：`PUT /schedules/<id>`
   - 删除：`DELETE /schedules/<id>`
   - 字段：车辆、员工、线路、发车时间、到达时间、状态

5. **用户与权限（User）**
   - 登录：`POST /users/login`
   - 创建用户（管理员）：`POST /users/`
   - 字段：用户名、是否管理员
   - 鉴权：JWT（access_token）+ `admin_required` 限制敏感操作

从前端角度，就是：**一个管理员后台**，包含 5 个模块 + 登录页 + 总览主页。

---

## 2. 整体架构设计（前后端职责）

### 技术栈

- 构建：Vite
- 前端框架：Vue 3（Composition API）
- UI：Ant Design Vue
- 样式：Tailwind CSS
- 路由：Vue Router
- 状态管理：Pinia（管理登录状态、当前用户信息等）
- HTTP：Axios

### 前后端职责划分

- **后端（Flask）**
  - 提供 RESTful API（如 `/api/vehicles` 等）
  - 负责鉴权、权限验证（JWT 校验 + `admin_required`）
  - 数据持久化、业务规则（外键校验、日期解析等）

- **前端（Vue+AntD+Tailwind）**
  - 提供管理后台 UI
  - 调用后端 API 展示数据、提交表单
  - 本地维护登录状态（JWT）、路由守卫
  - 页面级交互：表格、筛选、分页、图表/统计卡片

---

## 3. 路由与页面信息架构

### 顶层路由结构（示例）

- `/login` 登录页面
- `/` 布局根（含侧边栏 + 顶部导航 + 内容区）
  - `/dashboard` 系统主页（数据总览）
  - `/vehicles` 车辆管理
  - `/employees` 员工管理
  - `/routes` 线路管理
  - `/schedules` 班次管理
  - `/users` 用户管理（仅管理员可见）

你现有的 `views` 已有：

- `HomeView.vue`：可作为 `/dashboard`
- `VehicleView.vue`、`EmployeeView.vue`、`RouteView.vue`、`ScheduleView.vue`、`UserView.vue`：分别绑定上述路由

### 首页（Dashboard）内容规划

目标：**数据总览 + 快速导航**

1. 顶部统计卡片（使用 Ant Design 的 `Card` + Tailwind 布局）
   - 总车辆数 / 在运营车辆数
   - 总线路数 / 启用线路数
   - 今日/本周班次数量（按 status 简单统计）
   - 员工总数 / 在职员工数

   对应接口：在前端组合调用：
   - `GET /vehicles`
   - `GET /employees`
   - `GET /routes`
   - `GET /schedules?status=scheduled` 等

2. 中部图表或列表（可以后续再加 ECharts，当前只规划）
   - 最近班次列表（最近 N 条 `Schedule`，按创建时间/发车时间倒序）
   - 可视化：按线路统计班次数、按司机统计班次数（后续扩展）

3. 快捷入口
   - “新增线路”“新增班次”“车辆管理” 等按钮跳转对应管理页

---

## 4. 各模块管理界面设计

所有管理页采用统一模式：**搜索/筛选区 + 列表 + 新增/编辑弹窗 + 删除确认**。  
UI 组件上：AntD `Form` + `Input` + `Select` + `Table` + `Modal`，结合 Tailwind 做间距和布局。

### 4.1 车辆管理页 `/vehicles`

功能：

- 列表展示车辆
- 根据是否在运营筛选
- 新增、编辑、删除车辆

主要 UI 区块：

1. 顶部筛选/操作栏
   - 下拉：`在运营状态`（全部/在运营/停运） -> `in_service` query
   - 搜索框（可按车牌号本地过滤，后续也可后端支持）
   - 新增车辆按钮（打开 Modal）

2. 表格（AntD Table）
   - 列：车牌号、容量、车型、是否在运营、创建时间、操作（编辑/删除）
   - 行操作：
     - 编辑：打开表单 Modal，数据回填后 `PUT /vehicles/<id>`
     - 删除：弹出确认后调用 `DELETE /vehicles/<id>`

3. 弹窗表单（Modal + Form）
   - 字段：plate_number、capacity、model、in_service
   - 校验：车牌必填、容量为数字…

---

### 4.2 员工管理页 `/employees`

功能：

- 员工列表
- 根据在职状态筛选
- 新增、编辑、删除员工

UI 区块：

1. 筛选/操作栏
   - 状态筛选：active true/false
   - 搜索框：按姓名/角色（前端过滤）
   - 新增员工按钮

2. 表格
   - 列：姓名、角色、电话、入职日期、是否在职、操作
   - 操作同上：编辑（Modal）、删除

3. 弹窗表单
   - 字段：name、role（Select：司机、调度等）、phone、active、hire_date
   - hire_date 可以在前端使用 DatePicker（即便后端自动填，也可以允许修改）

---

### 4.3 线路管理页 `/routes`

功能：

- 管理公交线路：增删改查
- 筛选是否启用

UI 区块：

1. 筛选/操作栏
   - 是否启用（active）
   - 搜索框：线路名/线路编码
   - 新增线路按钮

2. 表格
   - 列：线路编码、名称、起点、终点、距离(km)、是否启用、操作

3. 弹窗表单
   - 字段：code、name、origin、destination、distance_km、active
   - code 需要唯一性提示（后端判断，前端展示错误）

---

### 4.4 班次管理页 `/schedules`

功能：

- 查看所有班次
- 按状态筛选
- 新增、编辑、删除班次

UI 要点：**牵涉多个实体，要做下拉选择**

1. 筛选栏
   - 班次状态：`status`（scheduled / running / completed / cancelled）
   - 日期范围（可前端过滤 departure_time）

2. 表格
   - 列：车辆（车牌号）、司机（员工名）、线路名、发车时间、到达时间、状态、操作
   - 因为后端返回的是 id，需要前端关联：
     - 在加载页时同时请求：
       - `GET /vehicles`
       - `GET /employees`
       - `GET /routes`
       - `GET /schedules`
     - 前端建立 `id -> name` 的 map 来显示

3. 弹窗表单
   - 字段：
     - vehicle_id：下拉选择车辆（显示车牌）
     - employee_id：下拉选择员工（显示姓名+角色）
     - route_id：下拉线路（显示“编码+名称”）
     - departure_time：DateTimePicker -> ISO string
     - arrival_time：可选 DateTimePicker
     - status：下拉
   - 提交：
     - `POST /schedules` / `PUT /schedules/<id>`
     - 捕获后端的时间格式错误，友好提示“请使用正确的日期时间格式”

---

### 4.5 用户管理页 `/users`

功能：

- 仅管理员能访问
- 用户列表（如后端增加 list 接口时），目前最少支持**创建新用户**
- 密码只在创建/修改时输入，列表不展示

UI 方案（在你现有接口基础上，先支持创建用户）：

1. 如果后端没有 list 接口，用户页可以简化为“创建用户表单 + 简单提示”。
2. 完整形态：
   - 表格：用户名、角色（是否管理员）、创建时间
   - 弹窗：创建新用户（username、password、is_admin）
   - 删除 / 修改（后端支持后再加）

---

## 5. 前端目录和组件结构（结合 Ant Design Vue + Tailwind）

基于你当前的结构，建议整理如下（仅规划，不写具体代码）：

### 5.1 src 总体结构

```text
src/
  main.js                 # 入口，注册 Ant Design Vue、Tailwind、Pinia、Router
  App.vue                 # 顶层组件，包含路由视图和全局布局容器
  router/
    index.js              # 定义路由（login + layout 下的各模块）
  store/
    auth.js               # Pinia：登录状态、当前用户、token
    ui.js                 # 可选：全局 UI 状态，比如 loading、主题
  api/
    http.js               # Axios 实例、拦截器（加 token）
    auth.js               # 登录、创建用户
    vehicle.js            # 车辆相关调用
    employee.js           # 员工相关调用
    route.js              # 线路相关调用
    schedule.js           # 班次相关调用
    user.js               # 用户管理（可与 auth 分开）
  layouts/
    AdminLayout.vue       # 主布局：侧边菜单 + 顶栏 + 内容
  views/
    LoginView.vue         # 登录页
    HomeView.vue          # Dashboard
    VehicleView.vue       # 车辆管理
    EmployeeView.vue      # 员工管理
    RouteView.vue         # 线路管理
    ScheduleView.vue      # 班次管理
    UserView.vue          # 用户管理
  components/
    layout/
      SideMenu.vue        # 左侧菜单（根据路由和权限渲染）
      HeaderBar.vue       # 顶部条（显示系统名、当前用户、退出按钮）
    dashboard/
      StatsCards.vue      # 首页统计卡片
      RecentSchedules.vue # 最近班次列表
    vehicles/
      VehicleTable.vue    # 车辆列表（Table + 筛选）
      VehicleFormModal.vue# 新增/编辑弹窗
    employees/
      EmployeeTable.vue
      EmployeeFormModal.vue
    routes/
      RouteTable.vue
      RouteFormModal.vue
    schedules/
      ScheduleTable.vue
      ScheduleFormModal.vue
    users/
      UserForm.vue        # 创建用户表单
```

### 5.2 样式与 UI 约定

- **Ant Design Vue 负责组件形态**：表格、表单、按钮、Modal、Tabs 等
- **Tailwind 负责布局与间距**：
  - 页面容器类：`p-4`, `space-y-4`, `flex`, `gap-4`
  - 响应式：`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4` 等
- 全局：在 `main.js` 中引入 `ant-design-vue/dist/reset.css` + Tailwind 主样式

---

## 6. 鉴权与权限控制流程设计

### 6.1 登录流程

1. 未登录访问任意受保护页面时，路由守卫重定向到 `/login`。
2. 用户在登录页输入 `username` / `password`，调用：
   - `POST /users/login` 返回：
     - `access_token`
     - `user`（包含 `is_admin`）
3. 前端将：
   - token 存到 `localStorage` 或 `sessionStorage`
   - 用户信息存到 Pinia `auth` store

4. 登录成功后跳转到 `/dashboard`。

### 6.2 请求拦截与错误处理

- 在 `api/http.js` 中创建 Axios 实例：
  - 请求拦截器：读取 store 中的 token，加到 `Authorization: Bearer <token>`
  - 响应拦截器：
    - 401：清理 token，跳转登录页
    - 其他错误：用 AntD 的消息组件 (`message.error`) 做统一提示

### 6.3 前端权限控制

- **路由守卫**：
  - 所有 `/` 下的页面都要求“已登录”
  - 某些路由（如 `/users`）要求 `is_admin === true`
- **菜单显示**：
  - `SideMenu.vue` 根据当前用户的 `is_admin` 决定是否显示“用户管理”菜单项
- **按钮级别控制**（可选）：
  - 即使进入列表页，普通用户对“新增/编辑/删除”按钮进行隐藏/禁用（后端仍有 `admin_required` 做最终防线）

---

## 7. 后续可扩展点（先记架构，不必现在做）

- 分页：后端支持 `?page=&page_size=` 后，在表格中做分页与服务器联动
- 导出：增加“导出为 Excel/CSV”按钮，基于当前筛选条件导出
- 图表：首页加线路客流或班次统计图（可对接 ECharts）
- 国际化：如果未来有英文需求，可以在 AntD 和自己的文案层集成 i18n

---

## 8. 小结

当前阶段，你需要的不是代码，而是：

1. 明确模块：车辆/员工/线路/班次/用户 + 登录
2. 设计：  
   - 页面路由结构  
   - 每个页面上的表格、筛选、表单/弹窗  
   - 首页 Dashboard 的数据聚合展示
3. 架构：  
   - src 目录组织  
   - API 调用层 + 鉴权拦截  
   - 布局 + 组件划分（Ant Design Vue + Tailwind 的分工）

如果你愿意，下一步我可以按这个架构，**从某一个模块开始（比如登录 + 布局 + 车辆管理）一点点把代码补齐**，包括具体组件实现和与现有 `src/api/*.js` 的对接。你想从哪一块先落地代码？