<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">微服务监控</span>
      <div>
        <el-button-group style="margin-right:12px;">
          <el-button size="small" :type="panelCols === 2 ? 'primary' : ''" @click="panelCols = 2">2列</el-button>
          <el-button size="small" :type="panelCols === 4 ? 'primary' : ''" @click="panelCols = 4">4列</el-button>
        </el-button-group>
        <el-button size="small" @click="openNsManagerDialog">管理微服务命名空间</el-button>
        <el-button size="small" @click="openServiceManagerDialog">管理微服务Service</el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="NAMESPACE">
          <el-select v-model="queryParams.namespace" placeholder="请先配置微服务命名空间" @change="handleNamespaceChange" :disabled="microserviceNamespaces.length === 0">
            <el-option v-for="item in microserviceNamespaces" :key="item" :label="item" :value="item" />
          </el-select>
          <span v-if="microserviceNamespaces.length === 0" style="margin-left:8px;color:#e6a23c;font-size:12px;">未配置，请点击右上角管理按钮添加</span>
        </el-form-item>
        <el-form-item label="SERVICE">
          <el-select v-model="queryParams.service" placeholder="Select Service" @change="handleServiceChange">
            <el-option v-for="item in serviceOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="POD">
          <el-select v-model="queryParams.pod" placeholder="Select Pod" @change="handleFilterChange">
            <el-option v-for="item in podOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item style="float:right;">
          <el-button type="primary" size="small" @click="openAddMetricDialog">新增监控指标</el-button>
          <el-button @click="refreshData">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 微服务基础信息 -->
    <el-card shadow="never" class="info-card" style="margin-bottom:12px;">
      <template #header>
        <span style="font-weight:bold;font-size:14px;">微服务基础信息</span>
      </template>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="集群命名空间总数">
          <span class="text-blue" style="font-weight:bold">{{ microserviceNamespaces.length }}</span> 个微服务命名空间
          <span style="color:#909399;font-size:12px;margin-left:6px">（集群共 {{ allNamespaces.length }} 个）</span>
        </el-descriptions-item>
        <el-descriptions-item label="当前命名空间">
          <el-tag size="small" type="success">{{ queryParams.namespace || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前命名空间服务数">
          <span class="text-blue" style="font-weight:bold">{{ serviceOptions.length }}</span> 个服务
          <span style="color:#909399;font-size:12px;margin-left:6px">当前服务：{{ queryParams.service || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="当前服务 Pod 数">
          <span class="text-blue" style="font-weight:bold">{{ realPodCount }}</span> 个 Pod
          <span style="color:#909399;font-size:12px;margin-left:6px">当前 Pod：{{ queryParams.pod || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="监控指标数">
          默认 <span class="text-blue" style="font-weight:bold">5</span> 项，自定义 <span class="text-blue" style="font-weight:bold">{{ customMetrics.length }}</span> 项
        </el-descriptions-item>
        <el-descriptions-item label="链路追踪">
          <el-tag size="small" type="primary">Jaeger</el-tag>
          <span style="color:#909399;font-size:12px;margin-left:6px">当前视图：{{ jaegerView === 'search' ? 'Trace 搜索' : '服务依赖拓扑' }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="15">
      <el-col :span="panelCols === 4 ? 6 : 12" v-for="panel in allPanels" :key="panel.id" style="margin-bottom:15px;">
        <el-card shadow="hover" :body-style="panelCols === 4 ? 'padding:0px;height:260px;overflow:hidden;' : 'padding:0px;height:320px;overflow:hidden;'">
          <template #header>
            <div style="padding:8px 15px;font-size:13px;font-weight:bold;background:#f9f9f9;display:flex;justify-content:space-between;align-items:center;">
              <span>{{ panel.name }}</span>
              <div>
                <el-button type="primary" link size="small" @click="editMetric(panel)">编辑</el-button>
                <el-button v-if="panel.isCustom" type="danger" link size="small" @click="deleteMetric(panel.id)">删除</el-button>
              </div>
            </div>
          </template>
          <iframe :src="panel.isCustom ? getCustomGrafanaUrl(panel) : getGrafanaUrl(panel)" width="100%" :height="panelCols === 4 ? 270 : 330" frameborder="0" scrolling="no" style="margin-top:-10px;"></iframe>
        </el-card>
      </el-col>
    </el-row>

    <!-- Jaeger 链路追踪 -->
    <el-card shadow="never" class="jaeger-card" style="margin-bottom:15px;">
      <template #header>
        <div class="jaeger-header">
          <div class="jaeger-header-left">
            <span style="font-weight:bold;">链路追踪（Jaeger）</span>
          </div>
          <div class="jaeger-header-right">
            <el-radio-group v-model="jaegerView" size="small" @change="onJaegerViewChange">
              <el-radio-button label="search">Trace 搜索</el-radio-button>
              <el-radio-button label="dependencies">服务依赖拓扑</el-radio-button>
            </el-radio-group>
            <el-tooltip content="在新窗口打开 Jaeger" placement="top">
              <el-button size="small" style="margin-left:8px;" @click="openJaegerExternal">外部打开</el-button>
            </el-tooltip>
          </div>
        </div>
      </template>
      <div class="jaeger-body">
        <div class="jaeger-iframe-wrap">
          <iframe
            v-if="jaegerSrc"
            :key="jaegerSrc"
            :src="jaegerSrc"
            class="jaeger-iframe"
            frameborder="0"
            scrolling="yes"
            allowfullscreen
          ></iframe>
          <div v-else class="jaeger-placeholder">
            <p>正在加载 Jaeger…</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 管理微服务命名空间 对话框 -->
    <el-dialog title="管理微服务命名空间" v-model="nsManagerVisible" width="700px" @open="onNsManagerOpen">
      <div class="ns-manager">
        <div class="ns-manager__desc">从集群所有命名空间中，选择属于微服务的命名空间。</div>
        <el-row :gutter="16" style="margin-top:16px;">
          <el-col :span="11">
            <div class="ns-panel-title">所有命名空间<span class="ns-panel-count">({{ allNamespacesFiltered.length }})</span></div>
            <div class="ns-search"><el-input v-model="nsSearchAll" size="small" placeholder="搜索..." clearable /></div>
            <div class="ns-list">
              <div v-for="ns in allNamespacesFiltered" :key="ns" class="ns-item" :class="{'is-selected': tempMicroserviceNamespaces.includes(ns)}" @click="toggleNsSelection(ns)">
                <span v-if="tempMicroserviceNamespaces.includes(ns)">✓</span><span v-else>+</span>&nbsp;{{ ns }}
              </div>
              <div v-if="allNamespacesFiltered.length === 0" class="ns-empty">暂无数据</div>
            </div>
          </el-col>
          <el-col :span="2" class="ns-arrow-col">→</el-col>
          <el-col :span="11">
            <div class="ns-panel-title">已选微服务命名空间<span class="ns-panel-count">({{ tempMicroserviceNamespaces.length }})</span></div>
            <div class="ns-search"><el-input v-model="nsSearchSelected" size="small" placeholder="搜索已选..." clearable /></div>
            <div class="ns-list">
              <div v-for="ns in tempMicroserviceNamespacesFiltered" :key="ns" class="ns-item ns-item--selected">
                {{ ns }}<span class="ns-item__remove" @click="removeNsSelection(ns)">✕</span>
              </div>
              <div v-if="tempMicroserviceNamespacesFiltered.length === 0" class="ns-empty">未选择任何命名空间</div>
            </div>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <el-button @click="nsManagerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMicroserviceNamespaces" :loading="nsSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑监控指标 对话框 -->
    <el-dialog :title="metricForm.id ? '编辑监控指标' : '新增监控指标'" v-model="metricDialogVisible" width="650px" @close="resetMetricForm">
      <el-form :model="metricForm" :rules="metricRules" ref="metricFormRef" label-width="140px">
        <el-form-item label="指标名称" prop="name">
          <el-input v-model="metricForm.name" placeholder="请输入指标名称" />
        </el-form-item>
        <el-form-item label="应用范围" v-if="metricForm.isCustom">
          <el-radio-group v-model="metricForm.scope">
            <el-radio label="pod">当前Pod（{{ queryParams.pod }}）</el-radio>
            <el-radio label="service">当前Service（{{ queryParams.service }}）</el-radio>
            <el-radio label="namespace">当前Namespace（{{ queryParams.namespace }}）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Grafana面板ID" v-if="!metricForm.isCustom">
          <el-input-number v-model="metricForm.grafanaPanelId" :min="1" />
        </el-form-item>
        <el-form-item label="Prometheus查询" prop="promql" v-if="metricForm.isCustom">
          <el-input v-model="metricForm.promql" type="textarea" :rows="4" placeholder='如：sum(rate(container_cpu_usage_seconds_total{namespace="$namespace"}[5m]))' />
          <div style="font-size:12px;color:#909399;margin-top:4px;">支持变量：$namespace $service $Pod</div>
        </el-form-item>
        <el-form-item label="图表类型" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.chartType">
            <el-option label="时序图" value="graph" />
            <el-option label="统计值" value="stat" />
            <el-option label="仪表盘" value="gauge" />
            <el-option label="柱状图" value="barchart" />
            <el-option label="表格" value="table" />
          </el-select>
        </el-form-item>
        <el-form-item label="数值单位" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.unit" filterable allow-create>
            <el-option label="无单位" value="none" />
            <el-option label="百分比" value="percent" />
            <el-option label="字节" value="bytes" />
            <el-option label="比特率" value="bps" />
            <el-option label="秒" value="s" />
            <el-option label="毫秒" value="ms" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="metricForm.timeRange">
            <el-option label="最近5分钟" value="5m" />
            <el-option label="最近15分钟" value="15m" />
            <el-option label="最近30分钟" value="30m" />
            <el-option label="最近1小时" value="1h" />
            <el-option label="最近3小时" value="3h" />
            <el-option label="最近6小时" value="6h" />
            <el-option label="最近12小时" value="12h" />
            <el-option label="最近24小时" value="24h" />
          </el-select>
        </el-form-item>
        <el-form-item label="刷新间隔">
          <el-select v-model="metricForm.refreshInterval">
            <el-option label="不刷新" value="" />
            <el-option label="5秒" value="5s" />
            <el-option label="10秒" value="10s" />
            <el-option label="30秒" value="30s" />
            <el-option label="1分钟" value="1m" />
            <el-option label="5分钟" value="5m" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="metricDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMetric">保存</el-button>
      </template>
    </el-dialog>

    <!-- 管理微服务 Service 对话框 -->
    <el-dialog title="管理微服务Service" v-model="serviceManagerVisible" width="700px" @open="onServiceManagerOpen">
      <div class="service-manager">
        <div class="service-manager__desc">从当前命名空间所有 Service 中，选择属于微服务的 Service。</div>
        <el-row :gutter="16" style="margin-top:16px;">
          <el-col :span="11">
            <div class="ns-panel-title">所有 Service<span class="ns-panel-count">({{ allServicesFiltered.length }})</span></div>
            <div class="ns-search"><el-input v-model="serviceSearchAll" size="small" placeholder="搜索..." clearable /></div>
            <div class="ns-list">
              <div v-for="svc in allServicesFiltered" :key="svc" class="ns-item" :class="{'is-selected': tempMicroserviceServices.includes(svc)}" @click="toggleServiceSelection(svc)">
                <span v-if="tempMicroserviceServices.includes(svc)">✓</span><span v-else>+</span>&nbsp;{{ svc }}
              </div>
              <div v-if="allServicesFiltered.length === 0" class="ns-empty">暂无数据</div>
            </div>
          </el-col>
          <el-col :span="2" class="ns-arrow-col">→</el-col>
          <el-col :span="11">
            <div class="ns-panel-title">已选微服务 Service<span class="ns-panel-count">({{ tempMicroserviceServices.length }})</span></div>
            <div class="ns-search"><el-input v-model="serviceSearchSelected" size="small" placeholder="搜索已选..." clearable /></div>
            <div class="ns-list">
              <div v-for="svc in tempMicroserviceServicesFiltered" :key="svc" class="ns-item ns-item--selected">
                {{ svc }}<span class="ns-item__remove" @click="removeServiceSelection(svc)">✕</span>
              </div>
              <div v-if="tempMicroserviceServicesFiltered.length === 0" class="ns-empty">未选择任何 Service</div>
            </div>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <el-button @click="serviceManagerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMicroserviceServices" :loading="serviceSaving">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>
<script>
import axios from 'axios';
import { listPanelConfig, savePanelConfig, delPanelConfig, listMicroserviceNamespaces, saveMicroserviceNamespaces } from '@/api/monitor/microservice';
import { listMicroserviceServices, saveMicroserviceServices as saveMicroserviceServicesApi } from '@/api/monitor/microservice';

export default {
  name: 'MicroServiceMonitor',
  data() {
    return {
      panelCols: 4,
      microserviceNamespaces: [],
      nsManagerVisible: false,
      nsSaving: false,
      allNamespaces: [],
      tempMicroserviceNamespaces: [],
      nsSearchAll: '',
      nsSearchSelected: '',
      queryParams: { namespace: '', service: '', pod: '' },
      serviceOptions: [],
      podOptions: [],
      grafanaBaseUrl: 'http://192.168.31.34:32556/d-solo/aa347ca0-0f9d-4716-a151-9494379e4405/microservice-pod',
      defaultPanels: [
        { id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_2', grafanaPanelId: 2, name: '内存使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_5', grafanaPanelId: 5, name: '网络接收',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_4', grafanaPanelId: 4, name: '网络发送',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_3', grafanaPanelId: 3, name: '磁盘 I/O',    isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ],
      customMetrics: [],
      metricDialogVisible: false,
      metricForm: { id: null, name: '', grafanaPanelId: null, promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'pod' },
      metricRules: { name: [{ required: true, message: '请输入指标名称', trigger: 'blur' }] },
      // Jaeger
      jaegerBaseUrl: 'http://192.168.31.34:32686',
      jaegerService: '',
      jaegerView: 'search',
      jaegerSrc: '',
      podFilterVisible: false,
      selectedNamespaceForPodFilter: '',
      allServices: [],  // 当前命名空间的所有 Service
      microserviceServices: {},  // 格式: { namespace: ['service1', 'service2'] }
      tempMicroserviceServices: [],  // 临时选择的微服务 Service
      serviceSearchAll: '',
      serviceSearchSelected: '',
      serviceSaving: false,
      serviceManagerVisible: false,
    };
  },
  computed: {
    realPodCount() { return this.podOptions.filter(i => i !== 'All').length; },
    allPanels() { return [...this.defaultPanels, ...this.customMetrics]; },
    allNamespacesFiltered() {
      const q = this.nsSearchAll.toLowerCase();
      return q ? this.allNamespaces.filter(n => n.toLowerCase().includes(q)) : this.allNamespaces;
    },
    tempMicroserviceNamespacesFiltered() {
      const q = this.nsSearchSelected.toLowerCase();
      return q ? this.tempMicroserviceNamespaces.filter(n => n.toLowerCase().includes(q)) : this.tempMicroserviceNamespaces;
    },
    allServicesFiltered() {
      const q = this.serviceSearchAll.toLowerCase();
      return q ? this.allServices.filter(s => s.toLowerCase().includes(q)) : this.allServices;
    },
    tempMicroserviceServicesFiltered() {
      const q = this.serviceSearchSelected.toLowerCase();
      return q ? this.tempMicroserviceServices.filter(s => s.toLowerCase().includes(q)) : this.tempMicroserviceServices;
    }
  },
  created() { this.init(); },
  methods: {
    async init() {
      try {
        await Promise.all([this.fetchAllNamespaces(), this.loadMicroserviceNamespaces()]);
        if (this.microserviceNamespaces.length > 0) {
          if (!this.microserviceNamespaces.includes(this.queryParams.namespace))
            this.queryParams.namespace = this.microserviceNamespaces[0];
          // 加载该命名空间的微服务 Service
          await this.loadMicroserviceServices(this.queryParams.namespace);
          this.fetchServices();
        } else {
          this.refreshJaeger();
        }
      } catch (e) { console.error('初始化失败', e); }
    },
    async loadMicroserviceServices(namespace) {
      try {
        const res = await listMicroserviceServices(namespace);
        if (res.code === 200 && Array.isArray(res.data)) {
          this.microserviceServices[namespace] = res.data;
        }
      } catch (e) { console.error('加载微服务 Service 失败', e); }
    },
    async handleNamespaceChange() {
      await this.loadMicroserviceServices(this.queryParams.namespace);
      this.fetchServices();
    },
    async saveMicroserviceServices() {
      this.serviceSaving = true;
      try {
        const ns = this.queryParams.namespace;
        await saveMicroserviceServicesApi(ns, this.tempMicroserviceServices);
        this.microserviceServices[ns] = [...this.tempMicroserviceServices];
        this.serviceManagerVisible = false;
        this.$message.success('微服务 Service 已保存');
      } catch (e) {
        this.$message.error('保存失败');
      } finally {
        this.serviceSaving = false;
      }
    },
    async fetchAllNamespaces() {
      try {
        const res = await axios.get('/api/datasources/proxy/1/api/v1/label/namespace/values');
        if (res.data.status === 'success') this.allNamespaces = res.data.data;
      } catch (e) { console.error('获取全部命名空间失败', e); }
    },
    async loadMicroserviceNamespaces() {
      try {
        const res = await listMicroserviceNamespaces();
        if (res.code === 200 && Array.isArray(res.data)) this.microserviceNamespaces = res.data;
      } catch (e) { console.error('加载微服务命名空间失败', e); }
    },
    openNsManagerDialog() { this.nsManagerVisible = true; },
    onNsManagerOpen() {
      this.nsSearchAll = ''; this.nsSearchSelected = '';
      this.tempMicroserviceNamespaces = [...this.microserviceNamespaces];
      if (this.allNamespaces.length === 0) this.fetchAllNamespaces();
    },
    toggleNsSelection(ns) {
      const idx = this.tempMicroserviceNamespaces.indexOf(ns);
      if (idx === -1) this.tempMicroserviceNamespaces.push(ns);
      else this.tempMicroserviceNamespaces.splice(idx, 1);
    },
    removeNsSelection(ns) { this.tempMicroserviceNamespaces = this.tempMicroserviceNamespaces.filter(n => n !== ns); },
    async saveMicroserviceNamespaces() {
      this.nsSaving = true;
      try {
        await saveMicroserviceNamespaces(this.tempMicroserviceNamespaces);
        this.microserviceNamespaces = [...this.tempMicroserviceNamespaces];
        if (!this.microserviceNamespaces.includes(this.queryParams.namespace)) {
          this.queryParams.namespace = this.microserviceNamespaces[0] || '';
          this.serviceOptions = []; this.podOptions = [];
          if (this.queryParams.namespace) this.fetchServices();
        }
        this.nsManagerVisible = false;
        this.$message.success('微服务命名空间已保存');
      } catch (e) { this.$message.error('保存失败'); } finally { this.nsSaving = false; }
    },
    async fetchServices() {
      try {
        const ns = this.queryParams.namespace;
        const url = `/api/datasources/proxy/1/api/v1/label/container/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container!="",container!="POD"}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') {
          const allSvcs = res.data.data;
          const microSvcs = this.microserviceServices[ns] || [];
          // 若已配置微服务 Service，则只显示已选的；否则显示全部
          this.serviceOptions = microSvcs.length > 0 ? allSvcs.filter(s => microSvcs.includes(s)) : allSvcs;
          if (this.serviceOptions.length > 0 && !this.serviceOptions.includes(this.queryParams.service))
            this.queryParams.service = this.serviceOptions[0];
          this.fetchPods();
        }
      } catch (e) { console.error(e); }
    },
    async fetchPods() {
      try {
        const ns = this.queryParams.namespace, svc = this.queryParams.service;
        const now = Math.floor(Date.now() / 1000), start = now - 300;
        const url = `/api/datasources/proxy/1/api/v1/label/pod/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container="${svc}"}&start=${start}&end=${now}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') {
          this.podOptions = ['All', ...res.data.data];
          if (!this.podOptions.includes(this.queryParams.pod)) this.queryParams.pod = 'All';
        }
      } catch (e) { console.error(e); }
      await this.loadSavedConfig();
      this.syncJaegerService(); // 同步 Jaeger focal service 并刷新 iframe
    },
    async handleNamespaceChange() {
      await this.loadMicroserviceServices(this.queryParams.namespace);
      this.fetchServices();
    },
    handleServiceChange()   { this.fetchPods(); this.syncJaegerService(); },
    async handleFilterChange() { await this.loadSavedConfig(); },
    refreshData() { this.init(); this.$message.success('数据已更新'); },
    openAddMetricDialog() { this.resetMetricForm(); this.metricForm.isCustom = true; this.metricDialogVisible = true; },
    editMetric(panel) { this.metricForm = { ...panel }; this.metricDialogVisible = true; },
    resetMetricForm() {
      this.metricForm = { id: null, name: '', grafanaPanelId: null, promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'pod' };
      this.$nextTick(() => { if (this.$refs.metricFormRef) this.$refs.metricFormRef.clearValidate(); });
    },
    getGrafanaUrl(panel) {
      const p = new URLSearchParams({ orgId: 1, theme: 'light', from: `now-${panel.timeRange||'5m'}`, to: 'now', refresh: panel.refreshInterval||'', panelId: panel.grafanaPanelId, 'var-namespace': this.queryParams.namespace, 'var-service': this.queryParams.service, 'var-Pod': this.queryParams.pod });
      return `${this.grafanaBaseUrl}?${p.toString()}`;
    },
    getCustomGrafanaUrl(panel) {
      const ns = this.queryParams.namespace, svc = this.queryParams.service, pod = this.queryParams.pod;
      const podVal = pod === 'All' ? '.*' : pod;
      const q = panel.promql.replace(/\$\{namespace\}|\$namespace/g, ns).replace(/\$\{service\}|\$service/g, svc).replace(/\$\{Pod\}|\$Pod/g, podVal);
      const panelId = { graph:1, timeseries:1, stat:2, gauge:3, barchart:4, table:5 }[panel.chartType] || 1;
      const p = new URLSearchParams({ orgId:1, theme:'light', from:`now-${panel.timeRange}`, to:'now', refresh:panel.refreshInterval||'', panelId, 'var-namespace':ns, 'var-service':svc, 'var-Pod':podVal, 'var-query':q, 'var-title':panel.name });
      return `http://192.168.31.34:32556/d-solo/custom-metrics/custom-metrics-dashboard?${p.toString()}`;
    },
    saveMetric() {
      this.$refs.metricFormRef.validate(async valid => {
        if (!valid) return;
        const { namespace: ns, service: svc, pod } = this.queryParams;
        if (!this.metricForm.isCustom) {
          const idx = this.defaultPanels.findIndex(p => p.id === this.metricForm.id);
          if (idx !== -1) { const u = { ...this.defaultPanels[idx], ...this.metricForm }; this.$set(this.defaultPanels, idx, u); await this.persistPanel(u, ns, svc, pod); }
          this.$message.success('面板已更新');
        } else {
          const scopeSvc = this.metricForm.scope === 'namespace' ? 'All' : svc;
          const scopePod = this.metricForm.scope === 'pod' ? pod : 'All';
          if (this.metricForm.id) {
            const idx = this.customMetrics.findIndex(m => m.id === this.metricForm.id);
            if (idx !== -1) { this.$set(this.customMetrics, idx, { ...this.metricForm }); await this.persistPanel(this.customMetrics[idx], ns, scopeSvc, scopePod); }
            this.$message.success('指标已更新');
          } else {
            const m = { ...this.metricForm, id: 'custom_' + Date.now() };
            this.customMetrics.push(m); await this.persistPanel(m, ns, scopeSvc, scopePod);
            this.$message.success('指标已添加');
          }
        }
        this.metricDialogVisible = false;
      });
    },
    async persistPanel(panel, namespace, service, pod) {
      try {
        await savePanelConfig({ namespace, service, pod, panelKey: panel.id, panelName: panel.name, isCustom: panel.isCustom ? 1 : 0, grafanaPanelId: panel.grafanaPanelId||null, promql: panel.promql||null, chartType: panel.chartType||'graph', unit: panel.unit||'none', timeRange: panel.timeRange||'5m', refreshInterval: panel.refreshInterval||'30s', sortOrder: panel.sortOrder||0, remark: panel.scope||'pod' });
      } catch (e) { console.error('保存面板配置失败', e); this.$message.warning('配置保存失败'); }
    },
    deleteMetric(id) {
      this.$confirm('确定要删除该监控指标吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(async () => {
        const panel = this.customMetrics.find(m => m.id === id);
        if (panel && panel.dbId) { try { await delPanelConfig(panel.dbId); } catch (e) { console.error(e); } }
        this.customMetrics = this.customMetrics.filter(m => m.id !== id);
        this.$message.success('指标已删除');
      }).catch(() => {});
    },
    // ===== Service Manager =====
    openServiceManagerDialog() {
      this.serviceManagerVisible = true;
    },
    onServiceManagerOpen() {
      this.serviceSearchAll = '';
      this.serviceSearchSelected = '';
      const ns = this.queryParams.namespace;
      this.tempMicroserviceServices = [...(this.microserviceServices[ns] || [])];
      this.fetchAllServicesInNamespace();
    },
    async fetchAllServicesInNamespace() {
      try {
        const ns = this.queryParams.namespace;
        if (!ns) { this.$message.warning('请先选择命名空间'); return; }
        const url = `/api/datasources/proxy/1/api/v1/label/container/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container!="",container!="POD"}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') this.allServices = res.data.data || [];
      } catch (e) { console.error('获取 Service 列表失败', e); }
    },
    toggleServiceSelection(svc) {
      const idx = this.tempMicroserviceServices.indexOf(svc);
      if (idx === -1) this.tempMicroserviceServices.push(svc);
      else this.tempMicroserviceServices.splice(idx, 1);
    },
    removeServiceSelection(svc) {
      this.tempMicroserviceServices = this.tempMicroserviceServices.filter(s => s !== svc);
    },
    async saveMicroserviceServices() {
      this.serviceSaving = true;
      try {
        const ns = this.queryParams.namespace;
        await saveMicroserviceServices(ns, this.tempMicroserviceServices);
        this.$set(this.microserviceServices, ns, [...this.tempMicroserviceServices]);
        // 保存后重新刷新 service 下拉列表
        await this.fetchServices();
        this.serviceManagerVisible = false;
        this.$message.success('微服务 Service 已保存');
      } catch (e) { this.$message.error('保存失败'); } finally { this.serviceSaving = false; }
    },
    async loadMicroserviceServices(namespace) {
      try {
        const res = await listMicroserviceServices(namespace);
        if (res.code === 200 && Array.isArray(res.data))
          this.$set(this.microserviceServices, namespace, res.data);
      } catch (e) { console.error('加载微服务 Service 失败', e); }
    },

    // ===== Jaeger =====
    syncJaegerService() {
      // 上方 SERVICE 下拉联动：同步服务并刷新 iframe
      this.jaegerService = this.queryParams.service || '';
      this.refreshJaeger();
    },
    onJaegerServiceChange() {
      this.refreshJaeger();
    },
    onJaegerViewChange() {
      this.refreshJaeger();
    },
    buildJaegerUrl() {
      const params = new URLSearchParams();
      params.set('uiEmbed', 'v0'); // 嵌入模式，隐藏 Jaeger 顶部导航
      if (this.jaegerView === 'search') {
        // Trace 搜索页：service 参数有效，会自动填入并查询
        if (this.jaegerService) params.set('service', this.jaegerService);
        params.set('limit', '20');
        params.set('lookback', '1h');
        return `${this.jaegerBaseUrl}/search?${params.toString()}`;
      } else {
        // 服务依赖拓扑页：基于真实 trace 数据计算的服务调用关系图
        return `${this.jaegerBaseUrl}/dependencies?${params.toString()}`;
      }
    },
    refreshJaeger() {
      // 用 :key 绑定强制 iframe 重建，确保每次都重新加载
      this.jaegerSrc = this.buildJaegerUrl();
    },
    openJaegerExternal() {
      window.open(this.buildJaegerUrl(), '_blank');
    },
    // ===== /Jaeger =====
    async loadSavedConfig() {
      const { namespace: ns, service: svc, pod } = this.queryParams;

      // 重置面板
      this.customMetrics = [];
      this.defaultPanels = [
        { id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_2', grafanaPanelId: 2, name: '内存使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_5', grafanaPanelId: 5, name: '网络接收',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_4', grafanaPanelId: 4, name: '网络发送',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_3', grafanaPanelId: 3, name: '磁盘 I/O',    isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ];

      if (!ns || !svc) return;

      try {
        const [r1, r2, r3] = await Promise.all([
          listPanelConfig({namespace:ns,service:svc,pod}), 
          listPanelConfig({namespace:ns,service:svc,pod:'All'}), 
          listPanelConfig({namespace:ns,service:'All',pod:'All'})
        ]);
        const seen = new Set(), all = [];
        for (const r of [r1,r2,r3]) { 
          if (r.code===200 && Array.isArray(r.data)) 
            r.data.forEach(p => { 
              if (!seen.has(p.panelKey)) { 
                seen.add(p.panelKey); 
                all.push(p); 
              } 
            }); 
        }
        all.filter(p => p.isCustom===0).forEach(d => { 
          const i = this.defaultPanels.findIndex(p => p.id===d.panelKey); 
          if (i!==-1) this.$set(this.defaultPanels, i, { ...this.defaultPanels[i], name:d.panelName, grafanaPanelId:d.grafanaPanelId, timeRange:d.timeRange, refreshInterval:d.refreshInterval, dbId:d.id }); 
        });
        this.customMetrics = all.filter(p => p.isCustom===1).map(d => ({ 
          id:d.panelKey, 
          dbId:d.id, 
          name:d.panelName, 
          isCustom:true, 
          grafanaPanelId:d.grafanaPanelId, 
          promql:d.promql, 
          chartType:d.chartType, 
          unit:d.unit, 
          timeRange:d.timeRange, 
          refreshInterval:d.refreshInterval, 
          sortOrder:d.sortOrder, 
          scope:d.remark||'pod' 
        }));
      } catch (e) { 
        console.error('加载面板配置失败', e); 
      }
    },
    selectPod(pod) {
      this.queryParams.pod = pod;
      this.podFilterVisible = false;
      this.loadSavedConfig();
      this.$message.success(`已选择 Pod: ${pod}`);
    }

  }
};
</script>

<style scoped>
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.page-title { font-size:18px; font-weight:bold; color:#303133; }
.filter-card { margin-bottom:10px; background-color:#fcfcfc; }
.stats-card { margin-bottom:15px; border-top:3px solid #1890ff; }
.stat-item { text-align:center; border-right:1px solid #f0f0f0; min-height:50px; }
.stat-item:last-child { border-right:none; }
.stat-label { font-size:11px; color:#999; font-weight:bold; margin-bottom:5px; white-space:nowrap; }
.stat-value { font-size:16px; font-weight:bold; }
.text-blue { color:#1890ff; } .text-black { color:#303133; }
.ns-manager__desc { color:#606266; font-size:13px; line-height:1.6; }
.ns-panel-title { font-size:13px; font-weight:bold; color:#303133; margin-bottom:8px; }
.ns-panel-count { font-size:12px; color:#909399; margin-left:4px; }
.ns-search { margin-bottom:8px; }
.ns-list { height:280px; overflow-y:auto; border:1px solid #ebeef5; border-radius:4px; padding:4px 0; }
.ns-item { padding:6px 12px; cursor:pointer; font-size:13px; color:#606266; display:flex; align-items:center; transition:background .2s; }
.ns-item:hover { background:#f5f7fa; }
.ns-item.is-selected { background:#ecf5ff; color:#409eff; }
.ns-item__check { margin-right:6px; font-size:12px; }
.ns-item__check--add { color:#c0c4cc; }
.ns-item--selected { background:#f0f9eb; color:#67c23a; justify-content:space-between; }
.ns-item__remove { cursor:pointer; color:#c0c4cc; font-size:13px; }
.ns-item__remove:hover { color:#f56c6c; }
.ns-empty { text-align:center; color:#c0c4cc; font-size:13px; padding:20px 0; }
.ns-arrow-col { display:flex; align-items:center; justify-content:center; font-size:20px; color:#c0c4cc; padding-top:60px; }
.pod-filter { padding: 0; }
.pod-list { max-height: 400px; overflow-y: auto; border: 1px solid #ebeef5; border-radius: 4px; }
.pod-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.pod-item:last-child { border-bottom: none; }
.pod-item:hover { background: #f5f7fa; }

/* ===== Jaeger ===== */
.jaeger-header { display:flex; justify-content:space-between; align-items:center; }
.jaeger-header-left { display:flex; align-items:center; }
.jaeger-header-right { display:flex; align-items:center; }
.jaeger-body { width:100%; }
.jaeger-iframe-wrap {
  position: relative;
  width: 100%;
  height: 620px;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
}
.jaeger-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.jaeger-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
}
.jaeger-placeholder-icon {
  font-size: 52px;
  margin-bottom: 12px;
  color: #d9d9d9;
}
</style>