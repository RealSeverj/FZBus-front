<template>
	<div class="p-6 h-full flex flex-col">
		<!-- 页面标题和操作栏 -->
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">站点管理</h1>
			<div class="flex gap-2">
				<el-button type="success" @click="handleLocateMe">
					<el-icon class="mr-1"><Aim /></el-icon>
					定位我的位置
				</el-button>
				<el-button type="primary" @click="handleAdd">
					<el-icon class="mr-1"><Plus /></el-icon>
					添加站点
				</el-button>
			</div>
		</div>

		<!-- 主内容区：左侧列表 + 右侧地图 -->
		<div class="flex gap-4 flex-1 min-h-0">
			<!-- 左侧站点列表 -->
			<div class="w-1/3 flex flex-col">
				<!-- 搜索筛选栏 -->
				<el-card class="mb-4" shadow="never">
					<div class="flex flex-col gap-3">
						<el-input
							v-model="searchKeyword"
							placeholder="搜索站点名称/高德ID"
							clearable
							@clear="handleSearch"
							@keyup.enter="handleSearch"
						>
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
						<div class="flex gap-2">
							<el-button type="primary" class="flex-1" @click="handleSearch">
								<el-icon class="mr-1"><Search /></el-icon>
								查询
							</el-button>
							<el-button class="flex-1" @click="resetFilters">
								<el-icon class="mr-1"><Refresh /></el-icon>
								重置
							</el-button>
						</div>
					</div>
				</el-card>

				<!-- 站点列表 -->
				<el-card class="flex-1 overflow-hidden" shadow="never">
					<div class="h-full flex flex-col">
						<el-table
							v-loading="loading"
							:data="busstops"
							stripe
							border
							class="flex-1"
							height="100%"
							highlight-current-row
							@row-click="handleRowClick"
							@sort-change="handleSortChange"
						>
							<el-table-column prop="id" label="ID" width="60" align="center" sortable="custom" />
							<el-table-column prop="name" label="站点名称" min-width="120" sortable="custom">
								<template #default="{ row }">
									<div class="flex items-center">
										<el-icon class="text-blue-500 mr-1"><Location /></el-icon>
										<span class="font-medium">{{ row.name }}</span>
									</div>
								</template>
							</el-table-column>
							<el-table-column label="操作" width="100" align="center">
								<template #default="{ row }">
									<el-button type="primary" link size="small" @click.stop="handleLocate(row)">
										<el-icon><Aim /></el-icon>
									</el-button>
									<el-button type="warning" link size="small" @click.stop="handleEdit(row)">
										<el-icon><Edit /></el-icon>
									</el-button>
									<el-button type="danger" link size="small" @click.stop="handleDelete(row)">
										<el-icon><Delete /></el-icon>
									</el-button>
								</template>
							</el-table-column>
						</el-table>

						<!-- 分页 -->
						<div class="flex justify-center mt-4 pt-2 border-t">
							<el-pagination
								v-model:current-page="currentPage"
								v-model:page-size="pageSize"
								:page-sizes="[20, 50, 100]"
								:total="totalCount"
								layout="total, sizes, prev, pager, next"
								background
								small
								@size-change="loadBusstops"
								@current-change="loadBusstops"
							/>
						</div>
					</div>
				</el-card>
			</div>

			<!-- 右侧地图区域 -->
			<div class="w-2/3 flex flex-col">
				<el-card class="flex-1" shadow="never">
					<template #header>
						<div class="flex justify-between items-center">
							<span class="font-bold">
								<el-icon class="mr-1"><MapLocation /></el-icon>
								站点地图
							</span>
							<div class="flex gap-2 items-center">
								<el-checkbox v-model="showAllMarkers" @change="toggleAllMarkers">
									显示全部站点
								</el-checkbox>
								<el-button type="primary" size="small" @click="handleMapClick" :disabled="!isAddingMarker">
									{{ isAddingMarker ? '点击地图添加站点' : '未选择位置' }}
								</el-button>
								<el-button
									v-if="!isAddingMarker"
									type="success"
									size="small"
									@click="startAddingMarker"
								>
									<el-icon class="mr-1"><Plus /></el-icon>
									地图选点
								</el-button>
								<el-button
									v-else
									type="danger"
									size="small"
									@click="cancelAddingMarker"
								>
									取消选点
								</el-button>
							</div>
						</div>
					</template>
					<div ref="mapContainer" class="w-full h-full min-h-[500px] rounded-lg"></div>
				</el-card>
			</div>
		</div>

		<!-- 新增/编辑站点对话框 -->
		<el-dialog
			v-model="dialogVisible"
			:title="isEdit ? '编辑站点' : '添加站点'"
			width="500px"
			destroy-on-close
			@close="resetForm"
		>
			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				label-width="100px"
				class="px-4"
			>
				<el-form-item label="高德ID" prop="amap_id">
					<el-input
						v-model="form.amap_id"
						placeholder="请输入高德地图站点ID，如：BV10208406"
						maxlength="50"
					/>
				</el-form-item>
				<el-form-item label="站点名称" prop="name">
					<el-input
						v-model="form.name"
						placeholder="请输入站点名称"
						maxlength="100"
					/>
				</el-form-item>
				<el-form-item label="经度" prop="longitude">
					<el-input-number
						v-model="form.longitude"
						:precision="6"
						:step="0.000001"
						:min="-180"
						:max="180"
						placeholder="请输入经度"
						class="w-full"
						controls-position="right"
					/>
				</el-form-item>
				<el-form-item label="纬度" prop="latitude">
					<el-input-number
						v-model="form.latitude"
						:precision="6"
						:step="0.000001"
						:min="-90"
						:max="90"
						placeholder="请输入纬度"
						class="w-full"
						controls-position="right"
					/>
				</el-form-item>
				<el-form-item>
					<el-button type="info" size="small" @click="pickFromMap">
						<el-icon class="mr-1"><Aim /></el-icon>
						从地图选取坐标
					</el-button>
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

		<!-- 站点详情对话框 -->
		<el-dialog
			v-model="detailDialogVisible"
			title="站点详情"
			width="600px"
			destroy-on-close
		>
			<div v-if="currentBusstop" class="space-y-4">
				<el-descriptions :column="2" border>
					<el-descriptions-item label="ID">{{ currentBusstop.id }}</el-descriptions-item>
					<el-descriptions-item label="高德ID">{{ currentBusstop.amap_id }}</el-descriptions-item>
					<el-descriptions-item label="站点名称" :span="2">
						<span class="font-semibold text-lg">{{ currentBusstop.name }}</span>
					</el-descriptions-item>
					<el-descriptions-item label="经度">{{ currentBusstop.longitude }}</el-descriptions-item>
					<el-descriptions-item label="纬度">{{ currentBusstop.latitude }}</el-descriptions-item>
					<el-descriptions-item label="坐标" :span="2">
						<el-tag type="info">{{ currentBusstop.longitude }}, {{ currentBusstop.latitude }}</el-tag>
						<el-button type="primary" link size="small" class="ml-2" @click="copyCoordinates">
							<el-icon><CopyDocument /></el-icon>
							复制
						</el-button>
					</el-descriptions-item>
				</el-descriptions>

				<!-- 经停线路 -->
				<div v-if="busstopRoutes.length > 0">
					<h4 class="font-bold mb-2">
						<el-icon class="mr-1"><Van /></el-icon>
						经停线路（{{ busstopRoutes.length }} 条）
					</h4>
					<div class="flex flex-wrap gap-2">
						<el-tag
							v-for="route in busstopRoutes"
							:key="route.id"
							type="success"
							effect="plain"
						>
							{{ route.code }} - {{ route.name }}
							<span v-if="route.stop_sequence" class="text-xs text-gray-400 ml-1">
								(第{{ route.stop_sequence }}站)
							</span>
						</el-tag>
					</div>
				</div>
				<div v-else class="text-gray-400 text-center py-4">
					暂无经停线路信息
				</div>
			</div>
			<template #footer>
				<div class="flex justify-between">
					<el-button type="primary" @click="handleLocate(currentBusstop)">
						<el-icon class="mr-1"><Aim /></el-icon>
						在地图上定位
					</el-button>
					<el-button @click="detailDialogVisible = false">关闭</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 附近站点搜索对话框 -->
		<el-dialog
			v-model="nearbyDialogVisible"
			title="搜索附近站点"
			width="500px"
			destroy-on-close
		>
			<el-form label-width="80px">
				<el-form-item label="经度">
					<el-input-number
						v-model="nearbySearch.longitude"
						:precision="6"
						class="w-full"
						controls-position="right"
					/>
				</el-form-item>
				<el-form-item label="纬度">
					<el-input-number
						v-model="nearbySearch.latitude"
						:precision="6"
						class="w-full"
						controls-position="right"
					/>
				</el-form-item>
				<el-form-item label="搜索半径">
					<el-slider
						v-model="nearbySearch.radius"
						:min="100"
						:max="5000"
						:step="100"
						show-input
						:format-tooltip="(val) => `${val}米`"
					/>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<el-button @click="nearbyDialogVisible = false">取消</el-button>
					<el-button type="primary" :loading="nearbyLoading" @click="handleNearbySearch">
						<el-icon class="mr-1"><Search /></el-icon>
						搜索附近站点
					</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
	Plus,
	Search,
	Refresh,
	Edit,
	Delete,
	Location,
	MapLocation,
	Aim,
	Van,
	CopyDocument,
} from '@element-plus/icons-vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import {
	fetchBusstops,
	fetchBusstopDetail,
	createBusstop,
	updateBusstop,
	deleteBusstop,
	fetchBusstopRoutes,
	fetchNearbyBusstops,
} from '@/api/busstop';

// 自定义站点图标基于高德内容标记
let AMap = null;

const createBusStopMarker = (stop) => {
	if (!AMap || !stop?.latitude || !stop?.longitude) return null;
	const content = `<div style="
		background-color: #409EFF;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: 0 2px 6px rgba(0,0,0,0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	">
		<span style="color: white; font-size: 12px; font-weight: bold;">B</span>
	</div>`;
	return new AMap.Marker({
		position: [stop.longitude, stop.latitude],
		content,
		offset: new AMap.Pixel(-12, -12),
	});
};

const createSelectedBusStopMarker = (stop) => {
	if (!AMap || !stop?.latitude || !stop?.longitude) return null;
	const content = `<div style="
		background-color: #E6A23C;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 4px solid white;
		box-shadow: 0 2px 8px rgba(0,0,0,0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: pulse 1.5s infinite;
	">
		<span style="color: white; font-size: 16px; font-weight: bold;">B</span>
	</div>`;
	return new AMap.Marker({
		position: [stop.longitude, stop.latitude],
		content,
		offset: new AMap.Pixel(-16, -16),
		zIndex: 1000,
	});
};

// 地图相关（高德）
const mapContainer = ref(null);
let map = null;
let markersLayer = [];
let selectedMarker = null;
let tempMarker = null;

// 列表数据
const busstops = ref([]);
const loading = ref(false);
const totalCount = ref(0);

// 搜索筛选
const searchKeyword = ref('');

// 排序
const sortBy = ref('id');
const sortOrder = ref('desc');

// 分页
const currentPage = ref(1);
const pageSize = ref(20);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref(null);

// 详情对话框
const detailDialogVisible = ref(false);
const currentBusstop = ref(null);
const busstopRoutes = ref([]);

// 地图选点
const isAddingMarker = ref(false);
const showAllMarkers = ref(true);

// 附近搜索
const nearbyDialogVisible = ref(false);
const nearbyLoading = ref(false);
const nearbySearch = reactive({
	longitude: 119.3,
	latitude: 26.08,
	radius: 500,
});

// 表单数据
const form = reactive({
	id: null,
	amap_id: '',
	name: '',
	longitude: null,
	latitude: null,
});

// 表单校验规则
const rules = {
	amap_id: [
		{ required: true, message: '请输入高德ID', trigger: 'blur' },
	],
	name: [
		{ required: true, message: '请输入站点名称', trigger: 'blur' },
		{ min: 1, max: 100, message: '站点名称长度在 1 到 100 个字符', trigger: 'blur' },
	],
	longitude: [
		{ required: true, message: '请输入经度', trigger: 'blur' },
		{ type: 'number', min: -180, max: 180, message: '经度范围 -180 到 180', trigger: 'blur' },
	],
	latitude: [
		{ required: true, message: '请输入纬度', trigger: 'blur' },
		{ type: 'number', min: -90, max: 90, message: '纬度范围 -90 到 90', trigger: 'blur' },
	],
};

// 初始化地图
const initMap = async () => {
	if (!mapContainer.value) return;
	if (map) return;

	AMap = await AMapLoader.load({
		key: import.meta.env.VITE_AMAP_KEY,
		version: '2.0',
		plugins: ['AMap.Marker', 'AMap.ToolBar', 'AMap.Circle'],
	});

	map = new AMap.Map(mapContainer.value, {
		center: [119.3, 26.08],
		zoom: 13,
	});

	map.addControl(new AMap.ToolBar());
	map.on('click', onMapClick);
};

// 地图点击处理
const onMapClick = (e) => {
	if (!isAddingMarker.value) return;

	const { lat, lng } = e.lnglat;

	// 移除之前的临时标记
	if (tempMarker) {
		map.remove(tempMarker);
	}

	// 添加新的临时标记
	const content = `<div style="
		background-color: #67C23A;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: 0 2px 8px rgba(0,0,0,0.4);
		display: flex;
		align-items: center;
		justify-content: center;
	">
		<span style="color: white; font-size: 14px; font-weight: bold;">+</span>
	</div>`;
	tempMarker = new AMap.Marker({
		position: [lng, lat],
		content,
		offset: new AMap.Pixel(-14, -14),
	});
	map.add(tempMarker);
};

// 全局函数：确认添加站点
window.confirmAddBusstop = (lng, lat) => {
	form.longitude = lng;
	form.latitude = lat;
	isAddingMarker.value = false;
	dialogVisible.value = true;

	if (tempMarker) {
		map.remove(tempMarker);
		tempMarker = null;
	}
};

// 开始地图选点模式
const startAddingMarker = () => {
	isAddingMarker.value = true;
	ElMessage.info('请在地图上点击选择站点位置');
};

// 取消地图选点
const cancelAddingMarker = () => {
	isAddingMarker.value = false;
	if (tempMarker) {
		map.remove(tempMarker);
		tempMarker = null;
	}
};

// 从表单打开地图选点
const pickFromMap = () => {
	dialogVisible.value = false;
	isAddingMarker.value = true;
	ElMessage.info('请在地图上点击选择坐标位置');
};

// 更新地图标记
const updateMapMarkers = () => {
	if (!map || !AMap) return;

	// 清理已有标记
	if (markersLayer.length) {
		map.remove(markersLayer);
		markersLayer = [];
	}

	if (!showAllMarkers.value) return;

	busstops.value.forEach((stop) => {
		if (stop.latitude && stop.longitude) {
			const marker = createBusStopMarker(stop);
			if (!marker) return;
			marker.setTitle(stop.name);
			marker.on('click', () => {
				window.showBusstopDetail(stop.id);
			});
			markersLayer.push(marker);
		}
	});

	if (markersLayer.length) {
		map.add(markersLayer);
	}
};

// 全局函数：显示站点详情
window.showBusstopDetail = async (id) => {
	await loadBusstopDetail(id);
	detailDialogVisible.value = true;
};

// 切换显示全部标记
const toggleAllMarkers = () => {
	updateMapMarkers();
};

// 加载站点列表
const loadBusstops = async () => {
	loading.value = true;
	try {
		const params = {
			include_routes: false,
			page: currentPage.value,
			per_page: pageSize.value,
			sort_by: sortBy.value,
			order: sortOrder.value,
		};
		if (searchKeyword.value.trim()) {
			params.keyword = searchKeyword.value.trim();
		}
		const data = await fetchBusstops(params);
		busstops.value = data.items || [];
		totalCount.value = data.total || 0;

		// 更新地图标记
		nextTick(() => {
			updateMapMarkers();
		});
	} catch (error) {
		console.error('获取站点列表失败:', error);
		busstops.value = [];
		totalCount.value = 0;
	} finally {
		loading.value = false;
	}
};

// 加载站点详情
const loadBusstopDetail = async (id) => {
	try {
		const data = await fetchBusstopDetail(id, true);
		currentBusstop.value = data;

		// 加载经停线路
		try {
			const routes = await fetchBusstopRoutes(id);
			busstopRoutes.value = routes || [];
		} catch {
			busstopRoutes.value = [];
		}
	} catch (error) {
		console.error('获取站点详情失败:', error);
	}
};

// 搜索
const handleSearch = () => {
	currentPage.value = 1;
	loadBusstops();
};

// 表格排序变化
const handleSortChange = ({ prop, order }) => {
	if (prop && order) {
		sortBy.value = prop;
		sortOrder.value = order === 'ascending' ? 'asc' : 'desc';
	} else {
		sortBy.value = 'id';
		sortOrder.value = 'desc';
	}
	currentPage.value = 1;
	loadBusstops();
};

// 重置筛选条件
const resetFilters = () => {
	searchKeyword.value = '';
	sortBy.value = 'id';
	sortOrder.value = 'desc';
	currentPage.value = 1;
	loadBusstops();
};

// 重置表单
const resetForm = () => {
	form.id = null;
	form.amap_id = '';
	form.name = '';
	form.longitude = null;
	form.latitude = null;
	isEdit.value = false;
	formRef.value?.resetFields();
};

// 点击表格行
const handleRowClick = async (row) => {
	await loadBusstopDetail(row.id);
	detailDialogVisible.value = true;
	handleLocate(row);
};

// 添加站点
const handleAdd = () => {
	resetForm();
	isEdit.value = false;
	dialogVisible.value = true;
};

// 编辑站点
const handleEdit = async (row) => {
	resetForm();
	isEdit.value = true;
	form.id = row.id;
	form.amap_id = row.amap_id;
	form.name = row.name;
	form.longitude = row.longitude;
	form.latitude = row.latitude;
	dialogVisible.value = true;
};

// 删除站点
const handleDelete = async (row) => {
	try {
		await ElMessageBox.confirm(
			`确定要删除站点「${row.name}」吗？此操作不可恢复。`,
			'删除确认',
			{
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
			},
		);

		await deleteBusstop(row.id);
		ElMessage.success('删除成功');
		loadBusstops();
	} catch (error) {
		if (error !== 'cancel') {
			console.error('删除站点失败:', error);
		}
	}
};

// 在地图上定位站点
const handleLocate = (row) => {
	if (!row || !row.latitude || !row.longitude) {
		ElMessage.warning('该站点没有坐标信息');
		return;
	}

	// 移除之前的选中标记
	if (selectedMarker) {
		map.removeLayer(selectedMarker);
	}

	// 定位到站点
	map.setZoomAndCenter(16, [row.longitude, row.latitude]);

	// 添加选中标记
	if (selectedMarker) {
		map.remove(selectedMarker);
		selectedMarker = null;
	}
	selectedMarker = createSelectedBusStopMarker(row);
	if (selectedMarker) {
		map.add(selectedMarker);
	}
};

// 定位到我的位置
const handleLocateMe = () => {
	if (!navigator.geolocation) {
		ElMessage.warning('您的浏览器不支持定位功能');
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(position) => {
			const { latitude, longitude } = position.coords;
			map.setView([latitude, longitude], 15);

			// 添加我的位置标记
			const content = `<div style="
				background-color: #F56C6C;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				border: 3px solid white;
				box-shadow: 0 2px 6px rgba(0,0,0,0.3);
			"></div>`;
			const marker = new AMap.Marker({
				position: [longitude, latitude],
				content,
				offset: new AMap.Pixel(-8, -8),
			});
			map.add(marker);

			// 设置附近搜索的默认坐标
			nearbySearch.longitude = longitude;
			nearbySearch.latitude = latitude;
		},
		(error) => {
			console.error('定位失败:', error);
			ElMessage.warning('定位失败，请检查定位权限');
		},
	);
};

// 提交表单
const handleSubmit = async () => {
	if (!formRef.value) return;

	try {
		await formRef.value.validate();
		submitting.value = true;

		const payload = {
			amap_id: form.amap_id,
			name: form.name,
			longitude: form.longitude,
			latitude: form.latitude,
		};

		if (isEdit.value) {
			await updateBusstop(form.id, payload);
			ElMessage.success('更新成功');
		} else {
			await createBusstop(payload);
			ElMessage.success('创建成功');
		}

		dialogVisible.value = false;
		loadBusstops();
	} catch (error) {
		if (error !== false) {
			console.error('提交失败:', error);
		}
	} finally {
		submitting.value = false;
	}
};

// 复制坐标
const copyCoordinates = () => {
	if (!currentBusstop.value) return;
	const text = `${currentBusstop.value.longitude},${currentBusstop.value.latitude}`;
	navigator.clipboard.writeText(text).then(() => {
		ElMessage.success('坐标已复制到剪贴板');
	});
};

// 附近搜索
const handleNearbySearch = async () => {
	nearbyLoading.value = true;
	try {
		const data = await fetchNearbyBusstops(
			nearbySearch.longitude,
			nearbySearch.latitude,
			nearbySearch.radius,
			50,
		);

		nearbyDialogVisible.value = false;

		if (data && data.length > 0) {
			// 在地图上显示搜索范围
			const circle = new AMap.Circle({
				center: [nearbySearch.longitude, nearbySearch.latitude],
				radius: nearbySearch.radius,
				strokeColor: '#409EFF',
				fillColor: '#409EFF',
				fillOpacity: 0.1,
			});
			map.add(circle);

			// 定位到搜索中心
			map.setZoomAndCenter(15, [nearbySearch.longitude, nearbySearch.latitude]);

			ElMessage.success(`找到 ${data.length} 个附近站点`);
		} else {
			ElMessage.info('附近没有找到站点');
		}
	} catch (error) {
		console.error('附近搜索失败:', error);
	} finally {
		nearbyLoading.value = false;
	}
};

// 页面加载
onMounted(() => {
	nextTick(async () => {
		await initMap();
		loadBusstops();
	});
});

// 页面卸载
onBeforeUnmount(() => {
	// 清理全局函数
	delete window.confirmAddBusstop;
	delete window.showBusstopDetail;

	// 销毁地图
	if (map) {
		map.destroy();
		map = null;
	}
});
</script>

<style scoped>
/* 自定义脉冲动画 */
@keyframes pulse {
	0% {
		transform: scale(1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
	50% {
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(230, 162, 60, 0.6);
	}
	100% {
		transform: scale(1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
}

/* 确保地图容器有正确的尺寸 */
:deep(.leaflet-container) {
	font-family: inherit;
}

:deep(.leaflet-popup-content-wrapper) {
	border-radius: 8px;
}

:deep(.leaflet-popup-content) {
	margin: 12px;
}
</style>
