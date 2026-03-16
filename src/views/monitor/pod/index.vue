<template>
  <div class="app-container">
    <div class="page-title">Pod 监控</div>
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="命名空间">
          <el-select v-model="queryParams.namespace" placeholder="选择命名空间" @change="handleNamespaceChange" filterable style="width:180px">
            <el-option v-for="item in namespaceOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="节点">
          <el-select v-model="queryParams.node" placeholder="全部节点" @change="handleNodeChange" filterable clearable style="width:180px">
            <el-option label="全部节点" value="" />
            <el-option v-for="item in nodeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="Pod">
          <el-select v-model="queryParams.pod" placeholder="选择 Pod" @change="handlePodChange" filterable style="width:260px">
            <el-option v-for="item in podOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item style="float: right;">
          <el-button type="primary" size="small" @click="openAddMetricDialog">➕ 新增监控指标</el-button>
          <el-button @click="refreshData">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="stats-card">
      <el-row :gutter="10">
        <el-col :span="4" class="stat-item"><div class="stat-label">命名空间总数</div><div class="stat-value text-blue">{{ namespaceOptions.length }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前命名空间</div><div class="stat-value text-black">{{ queryParams.namespace || '-' }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">节点总数</div><div class="stat-value text-blue">{{ nodeOptions.length }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前节点</div><div class="stat-value text-black">{{ queryParams.node || '全部' }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">Pod 总数</div><div class="stat-value text-blue">{{ realPodCount }}</div></el-col>
        <el-col :span="4" class="stat-item"><div class="stat-label">当前 Pod</div><div class="stat-value text-black" style="font-size:13px;word-break:break-all;">{{ queryParams.pod || '-' }}</div></el-col>
      </el-row>
    </el-card>
    <el-row :gutter="15">
      <el-col :span="12" v-for="panel in allPanels" :key="panel.id" style="margin-bottom:15px;">
        <el-card shadow="hover" body-style="padding:0px;height:320px;overflow:hidden;">
          <div slot="header" style="padding:8px 15px;font-size:13px;font-weight:bold;background:#f9f9f9;display:flex;justify-content:space-between;align-items:center;">
            <span>{{ panel.name }}</span>
            <div><el-button type="text" size="mini" icon="el-icon-edit" @click="editMetric(panel)">编辑</el-button><el-button v-if="panel.isCustom" type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c;" @click="deleteMetric(panel.id)">删除</el-button></div>
          </div>
          <iframe :src="panel.isCustom ? getCustomGrafanaUrl(panel) : getGrafanaUrl(panel)" width="100%" height="330" frameborder="0" scrolling="no" style="margin-top:-10px;"></iframe>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog :title="metricForm.id ? '编辑监控指标' : '新增监控指标'" :visible.sync="metricDialogVisible" width="620px" @close="resetMetricForm">
      <el-form :model="metricForm" :rules="metricRules" ref="metricFormRef" label-width="130px">
        <el-form-item label="指标名称" prop="name"><el-input v-model="metricForm.name" placeholder="请输入指标名称"></el-input></el-form-item>
        <el-form-item label="Grafana面板ID" v-if="!metricForm.isCustom"><el-input-number v-model="metricForm.grafanaPanelId" :min="1"></el-input-number></el-form-item>
        <el-form-item label="Prometheus查询" v-if="metricForm.isCustom">
          <el-input v-model="metricForm.promql" type="textarea" :rows="4" placeholder='如：sum(rate(container_cpu_usage_seconds_total{namespace="$namespace",pod="$pod"}[5m]))'></el-input>
          <div style="font-size:12px;color:#909399;margin-top:4px;">支持变量：$namespace $node $pod</div>
        </el-form-item>
        <el-form-item label="图表类型" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.chartType"><el-option label="时序图" value="graph"></el-option><el-option label="统计值" value="stat"></el-option><el-option label="仪表盘" value="gauge"></el-option><el-option label="柱状图" value="barchart"></el-option><el-option label="表格" value="table"></el-option></el-select>
        </el-form-item>
        <el-form-item label="数值单位" v-if="metricForm.isCustom">
          <el-select v-model="metricForm.unit" filterable allow-create><el-option label="无单位" value="none"></el-option><el-option label="百分比" value="percent"></el-option><el-option label="字节" value="bytes"></el-option><el-option label="比特率" value="bps"></el-option><el-option label="秒" value="s"></el-option><el-option label="毫秒" value="ms"></el-option></el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="metricForm.timeRange"><el-option label="最近5分钟" value="5m"></el-option><el-option label="最近15分钟" value="15m"></el-option><el-option label="最近30分钟" value="30m"></el-option><el-option label="最近1小时" value="1h"></el-option><el-option label="最近3小时" value="3h"></el-option><el-option label="最近6小时" value="6h"></el-option><el-option label="最近12小时" value="12h"></el-option><el-option label="最近24小时" value="24h"></el-option></el-select>
        </el-form-item>
        <el-form-item label="刷新间隔">
          <el-select v-model="metricForm.refreshInterval"><el-option label="不刷新" value=""></el-option><el-option label="5秒" value="5s"></el-option><el-option label="10秒" value="10s"></el-option><el-option label="30秒" value="30s"></el-option><el-option label="1分钟" value="1m"></el-option><el-option label="5分钟" value="5m"></el-option></el-select>
        </el-form-item>
      </el-form>
      <div slot="footer"><el-button @click="metricDialogVisible = false">取消</el-button><el-button type="primary" @click="saveMetric">保存</el-button></div>
    </el-dialog>
  </div>
</template>
<script>
import axios from 'axios';
import { listPodPanelConfig, savePodPanelConfig, delPodPanelConfig } from '@/api/monitor/pod';
export default {
  name: "PodMonitor",
  data() {
    return {
      queryParams: { namespace: '', node: '', pod: '' },
      namespaceOptions: [], nodeOptions: [], podOptions: [],
      grafanaBaseUrl: "http://39.98.35.84:6004/d-solo/aa347ca0-0f9d-4716-a151-9494379e4405/microservice-pod",
      defaultPanels: [
        { id: 'pod_default_1', grafanaPanelId: 1, name: 'CPU 使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_2', grafanaPanelId: 2, name: '内存使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_5', grafanaPanelId: 5, name: '网络接收',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_4', grafanaPanelId: 4, name: '网络发送',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_3', grafanaPanelId: 3, name: '磁盘 I/O',    isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ],
      customMetrics: [], metricDialogVisible: false,
      metricForm: { id: null, name: '', grafanaPanelId: null, promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true },
      metricRules: { name: [{ required: true, message: '请输入指标名称', trigger: 'blur' }] }
    };
  },
  computed: {
    realPodCount() { return this.podOptions.filter(i => i !== 'All').length; },
    allPanels() { return [...this.defaultPanels, ...this.customMetrics]; }
  },
  created() { this.init(); },
  methods: {
    async init() {
      try { await this.fetchNamespaces(); } catch (e) { console.error('初始化失败', e); }
    },

    async fetchNamespaces() {
      try {
        const res = await axios.get('/api/datasources/proxy/1/api/v1/label/namespace/values');
        if (res.data.status === 'success') {
          this.namespaceOptions = res.data.data;
          if (!this.namespaceOptions.includes(this.queryParams.namespace))
            this.queryParams.namespace = this.namespaceOptions[0] || '';
          if (this.queryParams.namespace) { this.fetchNodes(); this.fetchPods(); }
        }
      } catch (e) { this.$message.error('获取命名空间失败'); }
    },
    async fetchNodes() {
      try {
        const ns = this.queryParams.namespace;
        const now = Math.floor(Date.now() / 1000), start = now - 300;
        const url = `/api/datasources/proxy/1/api/v1/label/node/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container!="",container!="POD"}&start=${start}&end=${now}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') this.nodeOptions = res.data.data;
      } catch (e) { console.warn('节点列表获取失败(需kube-state-metrics)', e); }
    },
    async fetchPods() {
      const ns = this.queryParams.namespace;
      const node = this.queryParams.node;
      if (!ns) return;
      const now = Math.floor(Date.now() / 1000), start = now - 300;
      let pods = [];
      try {
        const url = `/api/datasources/proxy/1/api/v1/label/pod/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container!="",container!="POD"}&start=${start}&end=${now}`;
        const res = await axios.get(url);
        if (res.data.status === 'success' && res.data.data.length > 0) pods = res.data.data;
      } catch (e) { console.warn('container_memory查询失败', e); }
      if (node && this.nodeOptions.length > 0) {
        try {
          const url = `/api/datasources/proxy/1/api/v1/label/pod/values?match[]=container_memory_working_set_bytes{namespace="${ns}",node="${node}",container!="",container!="POD"}&start=${start}&end=${now}`;
          const res = await axios.get(url);
          if (res.data.status === 'success' && res.data.data.length > 0) pods = res.data.data;
        } catch (e) { console.warn('按节点过滤Pod失败', e); }
      }
      this.podOptions = ['All', ...pods];
      if (!this.podOptions.includes(this.queryParams.pod)) this.queryParams.pod = 'All';
      await this.loadSavedConfig();
    },
    handleNamespaceChange() { this.queryParams.node = ''; this.nodeOptions = []; this.podOptions = []; this.fetchNodes(); this.fetchPods(); },
    handleNodeChange() { this.podOptions = []; this.fetchPods(); },
    async handlePodChange() { await this.loadSavedConfig(); },
    refreshData() { this.fetchNamespaces(); this.$message.success('数据已更新'); },
    getGrafanaUrl(panel) {
      const params = new URLSearchParams({ orgId: 1, theme: 'light', from: `now-${panel.timeRange || '5m'}`, to: 'now', refresh: panel.refreshInterval || '', panelId: panel.grafanaPanelId, 'var-namespace': this.queryParams.namespace, 'var-service': '', 'var-Pod': this.queryParams.pod });
      return `${this.grafanaBaseUrl}?${params.toString()}`;
    },
    getCustomGrafanaUrl(panel) {
      const ns = this.queryParams.namespace, node = this.queryParams.node, pod = this.queryParams.pod;
      const podVal = pod === 'All' ? '.*' : pod;
      const resolvedQuery = panel.promql.replace(/\$\{namespace\}|\$namespace/g, ns).replace(/\$\{node\}|\$node/g, node || '.*').replace(/\$\{pod\}|\$pod/g, podVal);
      const panelId = ({ graph: 1, timeseries: 1, stat: 2, gauge: 3, barchart: 4, table: 5 })[panel.chartType] || 1;
      const params = new URLSearchParams({ orgId: 1, theme: 'light', from: `now-${panel.timeRange}`, to: 'now', refresh: panel.refreshInterval || '', panelId, 'var-namespace': ns, 'var-Pod': podVal, 'var-query': resolvedQuery, 'var-title': panel.name });
      return `http://39.98.35.84:6004/d-solo/custom-metrics/custom-metrics-dashboard?${params.toString()}`;
    },
    openAddMetricDialog() { this.resetMetricForm(); this.metricForm.isCustom = true; this.metricDialogVisible = true; },
    editMetric(panel) { this.metricForm = { ...panel }; this.metricDialogVisible = true; },
    resetMetricForm() {
      this.metricForm = { id: null, name: '', grafanaPanelId: null, promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true };
      this.$nextTick(() => { if (this.$refs.metricFormRef) this.$refs.metricFormRef.clearValidate(); });
    },
    saveMetric() {
      this.$refs.metricFormRef.validate(async valid => {
        if (!valid) return;
        const { namespace: ns, pod } = this.queryParams;
        if (!this.metricForm.isCustom) {
          const idx = this.defaultPanels.findIndex(p => p.id === this.metricForm.id);
          if (idx !== -1) { const u = { ...this.defaultPanels[idx], name: this.metricForm.name, grafanaPanelId: this.metricForm.grafanaPanelId, timeRange: this.metricForm.timeRange, refreshInterval: this.metricForm.refreshInterval }; this.$set(this.defaultPanels, idx, u); await this.persistPanel(u, ns, pod); }
          this.$message.success('面板已更新');
        } else {
          if (this.metricForm.id) {
            const idx = this.customMetrics.findIndex(m => m.id === this.metricForm.id);
            if (idx !== -1) { this.$set(this.customMetrics, idx, { ...this.metricForm }); await this.persistPanel(this.customMetrics[idx], ns, pod); }
            this.$message.success('指标已更新');
          } else {
            const m = { ...this.metricForm, id: 'pod_custom_' + Date.now() };
            this.customMetrics.push(m); await this.persistPanel(m, ns, pod);
            this.$message.success('指标已添加');
          }
        }
        this.metricDialogVisible = false;
      });
    },
    async persistPanel(panel, namespace, pod) {
      const payload = { namespace, pod, panelKey: panel.id, panelName: panel.name, isCustom: panel.isCustom ? 1 : 0, grafanaPanelId: panel.grafanaPanelId || null, promql: panel.promql || null, chartType: panel.chartType || 'graph', unit: panel.unit || 'none', timeRange: panel.timeRange || '5m', refreshInterval: panel.refreshInterval || '30s', sortOrder: panel.sortOrder || 0 };
      try { await savePodPanelConfig(payload); } catch (e) { this.$message.warning('配置保存失败'); }
    },
    deleteMetric(id) {
      this.$confirm('确定要删除该监控指标吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(async () => {
        const panel = this.customMetrics.find(m => m.id === id);
        if (panel && panel.dbId) { try { await delPodPanelConfig(panel.dbId); } catch (e) { console.error(e); } }
        this.customMetrics = this.customMetrics.filter(m => m.id !== id);
        this.$message.success('指标已删除');
      }).catch(() => {});
    },
    async loadSavedConfig() {
      const { namespace: ns, pod } = this.queryParams;
      if (!ns) return;
      this.customMetrics = [];
      this.defaultPanels = [
        { id: 'pod_default_1', grafanaPanelId: 1, name: 'CPU 使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_2', grafanaPanelId: 2, name: '内存使用率',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_5', grafanaPanelId: 5, name: '网络接收',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_4', grafanaPanelId: 4, name: '网络发送',    isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'pod_default_3', grafanaPanelId: 3, name: '磁盘 I/O',    isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ];
      try {
        const [resPod, resAll] = await Promise.all([listPodPanelConfig({ namespace: ns, pod }), listPodPanelConfig({ namespace: ns, pod: 'All' })]);
        const seen = new Set(), all = [];
        for (const res of [resPod, resAll]) { if (res.code === 200 && Array.isArray(res.data)) res.data.forEach(p => { if (!seen.has(p.panelKey)) { seen.add(p.panelKey); all.push(p); } }); }
        if (all.length > 0) {
          all.filter(p => p.isCustom === 0).forEach(d => { const i = this.defaultPanels.findIndex(p => p.id === d.panelKey); if (i !== -1) this.$set(this.defaultPanels, i, { ...this.defaultPanels[i], name: d.panelName, grafanaPanelId: d.grafanaPanelId, timeRange: d.timeRange, refreshInterval: d.refreshInterval, dbId: d.id }); });
          this.customMetrics = all.filter(p => p.isCustom === 1).map(d => ({ id: d.panelKey, dbId: d.id, name: d.panelName, isCustom: true, grafanaPanelId: d.grafanaPanelId, promql: d.promql, chartType: d.chartType, unit: d.unit, timeRange: d.timeRange, refreshInterval: d.refreshInterval, sortOrder: d.sortOrder }));
        }
      } catch (e) { console.error('加载面板配置失败', e); }
    }
  }
}
</script>

<style scoped>
.page-title { margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #303133; }
.filter-card { margin-bottom: 10px; background-color: #fcfcfc; }
.stats-card { margin-bottom: 15px; border-top: 3px solid #52c41a; }
.stat-item { text-align: center; border-right: 1px solid #f0f0f0; min-height: 50px; }
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 11px; color: #999; font-weight: bold; margin-bottom: 5px; white-space: nowrap; }
.stat-value { font-size: 16px; font-weight: bold; }
.text-blue { color: #1890ff; }
.text-black { color: #303133; }
</style>
