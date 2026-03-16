<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">微服务监控</span>
      <el-button size="small" @click="openNsManagerDialog">⚙️ 管理微服务命名空间</el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="NAMESPACE">
          <el-select v-model="queryParams.namespace" placeholder="请先配置微服务命名空间" @change="handleNamespaceChange" :disabled="microserviceNamespaces.length === 0">
            <el-option v-for="item in microserviceNamespaces" :key="item" :label="item" :value="item" />
          </el-select>
          <span v-if="microserviceNamespaces.length === 0" style="margin-left:8px;color:#e6a23c;font-size:12px;">⚠ 未配置，请点击右上角管理按钮添加</span>
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
          <el-button type="primary" size="small" @click="openAddMetricDialog">➕ 新增监控指标</el-button>
          <el-button size="small" @click="refreshData">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="stats-card">
      <el-row :gutter="10">
        <el-col :span="4" class="stat-item"><div class="stat-label">微服务命名空间数</div><div class="stat-value text-blue">{{ microserviceNamespaces.length }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前命名空间</div><div class="stat-value text-black">{{ queryParams.namespace || '-' }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">服务总数</div><div class="stat-value text-blue">{{ serviceOptions.length }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前服务</div><div class="stat-value text-black">{{ queryParams.service || '-' }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">Pod 总数</div><div class="stat-value text-blue">{{ realPodCount }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前 Pod</div><div class="stat-value text-black" style="font-size:13px;word-break:break-all;">{{ queryParams.pod || '-' }}</div></el-col>
      </el-row>
    </el-card>

    <el-row :gutter="15">
      <el-col :span="12" v-for="panel in allPanels" :key="panel.id" style="margin-bottom:15px;">
        <el-card shadow="hover" body-style="padding:0px;height:320px;overflow:hidden;">
          <template #header>
            <div style="padding:8px 15px;font-size:13px;font-weight:bold;background:#f9f9f9;display:flex;justify-content:space-between;align-items:center;">
              <span>{{ panel.name }}</span>
              <div>
                <el-button link type="primary" size="small" @click="editMetric(panel)">编辑</el-button>
                <el-button v-if="panel.isCustom" link type="danger" size="small" @click="deleteMetric(panel.id)">删除</el-button>
              </div>
            </div>
          </template>
          <iframe :src="panel.isCustom ? getCustomGrafanaUrl(panel) : getGrafanaUrl(panel)" width="100%" height="330" frameborder="0" scrolling="no" style="margin-top:-10px;"></iframe>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="jaeger-card" style="margin-bottom:15px;">
      <template #header>
        <div class="jaeger-header">
          <div class="jaeger-header-left">
            <span style="font-weight:bold;">🔗 链路追踪（Jaeger）</span>
          </div>
          <div class="jaeger-header-right">
            <el-radio-group v-model="jaegerView" size="small" @change="onJaegerViewChange">
              <el-radio-button label="search">Trace 搜索</el-radio-button>
              <el-radio-button label="dependencies">服务依赖拓扑</el-radio-button>
            </el-radio-group>
            <el-tooltip content="在新窗口打开 Jaeger" placement="top">
              <el-button size="small" style="margin-left:8px;" @click="openJaegerExternal">↗️ 打开</el-button>
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

    <el-dialog title="管理微服务命名空间" v-model="nsManagerVisible" width="700px" @open="onNsManagerOpen">
      <div class="ns-manager">
        <div class="ns-manager__desc">从集群所有命名空间中，选择属于微服务的命名空间。</div>
        <el-row :gutter="16" style="margin-top:16px;">
          <el-col :span="11">
            <div class="ns-panel-title">所有命名空间<span class="ns-panel-count">({{ allNamespacesFiltered.length }})</span></div>
            <div class="ns-search"><el-input v-model="nsSearchAll" size="small" placeholder="搜索..." clearable /></div>
            <div class="ns-list">
              <div v-for="ns in allNamespacesFiltered" :key="ns" class="ns-item" :class="{'is-selected':tempMicroserviceNamespaces.includes(ns)}" @click="toggleNsSelection(ns)">
                <span>{{ tempMicroserviceNamespaces.includes(ns) ? '✔️' : '➕' }}</span> {{ ns }}
              </div>
              <div v-if="allNamespacesFiltered.length===0" class="ns-empty">暂无数据</div>
            </div>
          </el-col>
          <el-col :span="2" class="ns-arrow-col"><span>➡️</span></el-col>
          <el-col :span="11">
            <div class="ns-panel-title">已选微服务命名空间<span class="ns-panel-count">({{ tempMicroserviceNamespaces.length }})</span></div>
            <div class="ns-search"><el-input v-model="nsSearchSelected" size="small" placeholder="搜索已选..." clearable /></div>
            <div class="ns-list">
              <div v-for="ns in tempMicroserviceNamespacesFiltered" :key="ns" class="ns-item ns-item--selected">
                {{ ns }}<span class="ns-item__remove" @click="removeNsSelection(ns)">❌</span>
              </div>
              <div v-if="tempMicroserviceNamespacesFiltered.length===0" class="ns-empty">未选择任何命名空间</div>
            </div>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="nsManagerVisible=false">取消</el-button>
          <el-button type="primary" @click="saveMicroserviceNamespaces" :loading="nsSaving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog :title="metricForm.id?'编辑监控指标':'新增监控指标'" v-model="metricDialogVisible" width="650px" @close="resetMetricForm">
      <el-form :model="metricForm" :rules="metricRules" ref="metricFormRef" label-width="140px">
        <el-form-item label="指标名称" prop="name"><el-input v-model="metricForm.name" placeholder="请输入指标名称"></el-input></el-form-item>
        <el-form-item label="应用范围" v-if="metricForm.isCustom">
          <el-radio-group v-model="metricForm.scope">
            <el-radio label="pod">当前Pod（{{ queryParams.pod }}）</el-radio>
            <el-radio label="service">当前Service（{{ queryParams.service }}）</el-radio>
            <el-radio label="namespace">当前Namespace（{{ queryParams.namespace }}）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Grafana面板ID" v-if="!metricForm.isCustom"><el-input-number v-model="metricForm.grafanaPanelId" :min="1"></el-input-number></el-form-item>
        <el-form-item label="Prometheus查询" prop="promql" v-if="metricForm.isCustom">
          <el-input v-model="metricForm.promql" type="textarea" :rows="4" placeholder='如：sum(rate(container_cpu_usage_seconds_total{namespace="$namespace",container="$service",pod=~"$Pod"}[5m]))'></el-input>
          <div style="font-size:12px;color:#909399;margin-top:4px;">支持变量：$namespace $service $Pod</div>
        </el-form-item>
        <el-form-item label="图表类型" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.chartType">
            <el-option label="时序图" value="graph"></el-option>
            <el-option label="统计值" value="stat"></el-option>
            <el-option label="仪表盘" value="gauge"></el-option>
            <el-option label="柱状图" value="barchart"></el-option>
            <el-option label="表格" value="table"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="数值单位" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.unit" filterable allow-create>
            <el-option label="无单位" value="none"></el-option>
            <el-option label="百分比" value="percent"></el-option>
            <el-option label="字节" value="bytes"></el-option>
            <el-option label="比特率" value="bps"></el-option>
            <el-option label="秒" value="s"></el-option>
            <el-option label="毫秒" value="ms"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="metricForm.timeRange">
            <el-option label="最近5分钟" value="5m"></el-option>
            <el-option label="最近15分钟" value="15m"></el-option>
            <el-option label="最近30分钟" value="30m"></el-option>
            <el-option label="最近1小时" value="1h"></el-option>
            <el-option label="最近3小时" value="3h"></el-option>
            <el-option label="最近6小时" value="6h"></el-option>
            <el-option label="最近12小时" value="12h"></el-option>
            <el-option label="最近24小时" value="24h"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="刷新间隔">
          <el-select v-model="metricForm.refreshInterval">
            <el-option label="不刷新" value=""></el-option>
            <el-option label="5秒" value="5s"></el-option>
            <el-option label="10秒" value="10s"></el-option>
            <el-option label="30秒" value="30s"></el-option>
            <el-option label="1分钟" value="1m"></el-option>
            <el-option label="5分钟" value="5m"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="metricDialogVisible=false">取消</el-button>
          <el-button type="primary" @click="saveMetric">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { listPanelConfig, savePanelConfig, delPanelConfig, listMicroserviceNamespaces, saveMicroserviceNamespaces } from '@/api/monitor/microservice';

export default {
  name: 'MicroServiceMonitor',
  data() {
    return {
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
      grafanaBaseUrl: 'http://39.98.35.84:6004/d-solo/aa347ca0-0f9d-4716-a151-9494379e4405/microservice-pod',
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
      jaegerBaseUrl: 'http://39.98.35.84:6003',
      jaegerService: '',
      jaegerView: 'search',
      jaegerSrc: ''
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
          this.fetchServices(); // fetchServices -> fetchPods -> syncJaegerService 会自动刷新
        } else {
          // 没有配置命名空间时直接显示 Jaeger
          this.refreshJaeger();
        }
      } catch (e) { console.error('初始化失败', e); }
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
          this.serviceOptions = res.data.data;
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
    handleNamespaceChange() { this.fetchServices(); },
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
      return `http://39.98.35.84:6004/d-solo/custom-metrics/custom-metrics-dashboard?${p.toString()}`;
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
      if (!ns || !svc) return;
      this.customMetrics = [];
      this.defaultPanels = [
        { id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_2', grafanaPanelId: 2, name: '内存使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_5', grafanaPanelId: 5, name: '网络接收',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_4', grafanaPanelId: 4, name: '网络发送',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_3', grafanaPanelId: 3, name: '磁盘 I/O',    isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ];
      try {
        const [r1, r2, r3] = await Promise.all([listPanelConfig({namespace:ns,service:svc,pod}), listPanelConfig({namespace:ns,service:svc,pod:'All'}), listPanelConfig({namespace:ns,service:'All',pod:'All'})]);
        const seen = new Set(), all = [];
        for (const r of [r1,r2,r3]) { if (r.code===200 && Array.isArray(r.data)) r.data.forEach(p => { if (!seen.has(p.panelKey)) { seen.add(p.panelKey); all.push(p); } }); }
        all.filter(p => p.isCustom===0).forEach(d => { const i = this.defaultPanels.findIndex(p => p.id===d.panelKey); if (i!==-1) this.$set(this.defaultPanels, i, { ...this.defaultPanels[i], name:d.panelName, grafanaPanelId:d.grafanaPanelId, timeRange:d.timeRange, refreshInterval:d.refreshInterval, dbId:d.id }); });
        this.customMetrics = all.filter(p => p.isCustom===1).map(d => ({ id:d.panelKey, dbId:d.id, name:d.panelName, isCustom:true, grafanaPanelId:d.grafanaPanelId, promql:d.promql, chartType:d.chartType, unit:d.unit, timeRange:d.timeRange, refreshInterval:d.refreshInterval, sortOrder:d.sortOrder, scope:d.remark||'pod' }));
      } catch (e) { console.error('加载面板配置失败', e); }
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
