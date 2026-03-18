<template>
  <div class="app-container jars-monitor">

    <div class="page-header">
      <span class="page-title">Jars 应用监控</span>
      <div>
        <el-button-group style="margin-right:12px;">
          <el-button size="small" :type="panelCols === 2 ? 'primary' : ''" @click="panelCols = 2">2列</el-button>
          <el-button size="small" :type="panelCols === 4 ? 'primary' : ''" @click="panelCols = 4">4列</el-button>
        </el-button-group>
        <el-button size="small" icon="el-icon-plus" type="primary" @click="openAddMetricDialog">新增自定义指标</el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="设备">
            <el-select v-model="queryParams.device" placeholder="请选择设备" :loading="appsLoading" @change="handleDeviceChange" style="width:160px">
                <el-option label="全部设备" value="All" />
                <el-option v-for="d in deviceOptions" :key="d" :label="d" :value="d" />
            </el-select>
        </el-form-item>
        <el-form-item label="应用分类">
          <el-select v-model="queryParams.category" placeholder="请选择分类" @change="handleCategoryChange" style="width:160px">
            <el-option label="全部分类" value="All" />
            <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用">
          <el-select v-model="queryParams.appName" placeholder="请选择应用" @change="handleAppChange" style="width:200px">
            <el-option label="全部应用" value="All" />
            <el-option v-for="a in appOptions" :key="a.appName" :label="a.appName" :value="a.appName" />
          </el-select>
        </el-form-item>
        <el-form-item style="float:right">
          <el-button icon="el-icon-refresh" @click="refreshData">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <transition name="fade-slide">
      <el-card v-if="currentApp" shadow="never" class="app-info-card">
        <div slot="header" class="app-info-header">
          <i class="el-icon-s-platform" style="color:#409eff;margin-right:6px"></i>
          <span style="font-weight:bold">{{ currentApp.appName }}</span>
          
        </div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="启动命令" :span="2">
            <el-tooltip :content="currentApp.startCmd" placement="top" :disabled="!currentApp.startCmd">
              <span class="code-text">{{ currentApp.startCmd || '-' }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="所在设备">
            {{ currentApp.ipAddress || currentApp.device || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="工作目录" :span="2">
            <span class="code-text">{{ currentApp.workDir || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="运行时长">
            {{ processStatus.uptimeText || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Java版本">
            {{ currentApp.javaVersion || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ currentApp.leader || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="运行状态">
            <span v-if="processStatus.isRunning === null" style="color:#909399">查询中...</span>
            <el-tag v-else-if="processStatus.isRunning" type="success" size="mini">运行中</el-tag>
            <el-tag v-else type="danger" size="mini">未运行</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </transition>


    <el-row :gutter="15">
      <el-col :span="panelCols === 4 ? 6 : 12" v-for="panel in allPanels" :key="panel.id" style="margin-bottom:15px;">
        <el-card shadow="hover" :body-style="panelCols === 4 ? 'padding:0;height:260px;overflow:hidden;' : 'padding:0;height:320px;overflow:hidden;'">
          <div slot="header" style="padding:8px 15px;font-size:13px;font-weight:bold;background:#f9fafb;display:flex;justify-content:space-between;align-items:center;">
            <span>{{ panel.name }}</span>
            <div>
              <el-button type="text" size="mini" icon="el-icon-edit" @click="editMetric(panel)"></el-button>
              <el-button v-if="panel.isCustom" type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c;" @click="deleteMetric(panel.id)"></el-button>
            </div>
          </div>
          <iframe :src="panel.isCustom ? getCustomGrafanaUrl(panel) : getGrafanaUrl(panel)" width="100%" :height="panelCols === 4 ? 270 : 330" frameborder="0" scrolling="no" style="margin-top:-10px;"></iframe>
        </el-card>
      </el-col>
    </el-row>

    <div v-if="allPanels.length === 0 && !appsLoading" class="empty-state">
      <i class="el-icon-data-analysis empty-icon"></i>
      <p>暂无监控面板，请先选择具体应用或添加自定义指标</p>
    </div>

    <!-- METRIC DIALOG -->
    <el-dialog :title="metricForm.id ? '编辑自定义指标' : '新增自定义指标'" v-model="metricDialogVisible" width="660px" @close="resetMetricForm">
      <el-form :model="metricForm" :rules="metricRules" ref="metricFormRef" label-width="120px">
        <el-form-item label="指标名称" prop="name">
          <el-input v-model="metricForm.name" placeholder="如：JVM堆内存"></el-input>
        </el-form-item>
        <el-form-item label="生效范围">
          <el-radio-group v-model="metricForm.scope">
            <el-radio label="app">当前应用（{{ queryParams.appName }}）</el-radio>
            <el-radio label="category">当前分类（{{ queryParams.category }}）</el-radio>
            <el-radio label="device">当前设备（{{ queryParams.device }}）</el-radio>
            <el-radio label="global">全局</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Prometheus查询" prop="promql">
          <el-input v-model="metricForm.promql" type="textarea" :rows="4" placeholder='如：process_cpu_usage{job="$appName"}'></el-input>
          <div style="font-size:12px;color:#909399;margin-top:4px;">支持变量：$device $category $appName</div>
        </el-form-item>
        <el-form-item label="图表类型">
          <el-select v-model="metricForm.chartType" style="width:140px">
            <el-option label="时序图" value="graph"></el-option>
            <el-option label="统计值" value="stat"></el-option>
            <el-option label="仪表盘" value="gauge"></el-option>
            <el-option label="柱状图" value="barchart"></el-option>
            <el-option label="表格" value="table"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="数值单位">
          <el-select v-model="metricForm.unit" filterable allow-create style="width:140px">
            <el-option label="无单位" value="none"></el-option>
            <el-option label="百分比" value="percent"></el-option>
            <el-option label="字节" value="bytes"></el-option>
            <el-option label="比特率" value="bps"></el-option>
            <el-option label="秒" value="s"></el-option>
            <el-option label="毫秒" value="ms"></el-option>
          </el-select>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="时间范围">
              <el-select v-model="metricForm.timeRange" style="width:130px">
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
          </el-col>
          <el-col :span="12">
            <el-form-item label="刷新间隔">
              <el-select v-model="metricForm.refreshInterval" style="width:130px">
                <el-option label="不刷新" value=""></el-option>
                <el-option label="5秒" value="5s"></el-option>
                <el-option label="10秒" value="10s"></el-option>
                <el-option label="30秒" value="30s"></el-option>
                <el-option label="1分钟" value="1m"></el-option>
                <el-option label="5分钟" value="5m"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="metricDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMetric">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script>
import { listJarsApps, listJarsPanelConfig, saveJarsPanelConfig, delJarsPanelConfig } from '@/api/monitor/jars'

export default {
  name: 'JarsMonitor',
  data() {
    return {
      grafanaBaseUrl: 'http://192.168.31.34:32556/d-solo/ce228ddf-bb69-4363-8a15-4cab4c51a5cf/petclinic-monitor',
      panelCols: 4,
      refreshKey: 0,
      appsLoading: false,
      allApps: [],
      physicalNameMap: {},  // { physicalId: 'node1' }
      queryParams: { device: 'All', category: 'All', appName: 'All' },
      defaultPanels: [
        { id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用',       isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_2', grafanaPanelId: 2, name: '内存使用（MB）',  isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_3', grafanaPanelId: 4, name: '线程数',          isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_4', grafanaPanelId: 3, name: '打开文件描述符',   isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ],
      customMetrics: [],
      processStatus: {
        isRunning: null,
        uptimeSeconds: null,
        uptimeText: ''
      },
      metricDialogVisible: false,
      metricForm: { id: null, name: '', promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'app' },
      metricRules: {
        name:   [{ required: true, message: '请输入指标名称', trigger: 'blur' }],
        promql: [{ required: true, message: '请输入Prometheus查询语句', trigger: 'blur' }]
      }
    }
  },

  computed: {
    deviceOptions() {
        return [...new Set(this.allApps.map(a => a.ipAddress).filter(Boolean))]
    },
    allCategories() {
      return [...new Set(this.allApps.map(a => a.category).filter(Boolean))]
    },
    categoryOptions() {
      const apps = this.queryParams.device === 'All'
        ? this.allApps
        : this.allApps.filter(a => a.ipAddress === this.queryParams.device)
      return [...new Set(apps.map(a => a.category).filter(Boolean))]
    },
    appOptions() {
      return this.allApps.filter(a => {
        if (this.queryParams.device !== 'All' && a.ipAddress !== this.queryParams.device) return false
        if (this.queryParams.category !== 'All' && a.category !== this.queryParams.category) return false
        return true
      })
    },
    currentApp() {
      if (!this.queryParams.appName || this.queryParams.appName === 'All') return null
      return this.allApps.find(a =>
        a.appName === this.queryParams.appName &&
        (this.queryParams.device === 'All' || a.ipAddress === this.queryParams.device)
      ) || null
    },
    allPanels() {
      return [...this.defaultPanels, ...this.customMetrics]
    }
  },

  created() {
    this.loadApps()
  },

  watch: {
    currentApp(val) {
      if (val) {
        this.queryProcessStatus(val)
      } else {
        this.processStatus = { isRunning: null, uptimeSeconds: null, uptimeText: '' }
      }
      this.refreshKey++
    },
    'queryParams.device'() {
      this.refreshKey++
    },
    'queryParams.appName'() {
      this.refreshKey++
    }
  },

  methods: {
    async loadApps() {
      this.appsLoading = true
      try {
        const res = await listJarsApps()
        // /device/jars/list 返回 { rows: [...], total: N }
        const rows = res.rows || res.data || []
        // 将 JarsAppMaster 字段映射为监控页面所需字段
        this.allApps = rows.map(item => ({
          jarsId:    item.jarsId,
          appName:   item.appName,
          category:  item.category || 'default',
          device:    String(item.deviceId || ''),   // deviceId 作为设备标识
          ipAddress: item.ipAddress,
          port:      item.port,
          metricsPort: item.metricsPort,
          metricsPath: item.metricsPath,
          deployPath:  item.deployPath,
          jvmArgs:     item.jvmArgs,
          javaVersion: item.javaVersion,
          leader:      item.leader,
          status:      item.status === 0 ? 'running' : 'stopped',
          startCmd:    item.deployPath ? `java ${item.jvmArgs || ''} -jar ${item.deployPath}`.trim() : '-',
          workDir:     item.deployPath ? item.deployPath.substring(0, item.deployPath.lastIndexOf('/') + 1) : '-',
          resourceLimit: item.jvmArgs || '-'
        }))
        if (this.deviceOptions.length > 0) this.queryParams.device = this.deviceOptions[0]
        if (this.categoryOptions.length > 0) this.queryParams.category = this.categoryOptions[0]
        if (this.appOptions.length > 0) {
          this.queryParams.appName = this.appOptions[0].appName
          await this.loadSavedConfig()
        }
      } catch (e) {
        console.warn('Jars应用管理接口异常', e)
      } finally {
        this.appsLoading = false
      }
    },

    handleDeviceChange() {
      this.queryParams.category = 'All'
      this.queryParams.appName = 'All'
      this.customMetrics = []
      if (this.categoryOptions.length > 0) this.queryParams.category = this.categoryOptions[0]
      if (this.appOptions.length > 0) {
        this.queryParams.appName = this.appOptions[0].appName
        this.loadSavedConfig()
      }
      this.refreshKey++
    },

    handleCategoryChange() {
      this.queryParams.appName = 'All'
      this.customMetrics = []
      if (this.appOptions.length > 0) {
        this.queryParams.appName = this.appOptions[0].appName
        this.loadSavedConfig()
      }
    },

    async handleAppChange() {
      await this.loadSavedConfig()
    },

    refreshData() {
      this.loadApps()
      this.$message.success('数据已刷新')
    },

    getGrafanaUrl(panel) {
      // device_ip: 当前应用的 IP 地址
      // application: process-exporter 的 groupname（即 jar 包名或进程名）
      const deviceIp = this.currentApp ? (this.currentApp.ipAddress || '') : ''
      const application = this.queryParams.appName === 'All' ? '' : this.queryParams.appName
      const p = new URLSearchParams({
        orgId: 1,
        theme: 'light',
        panelId: panel.grafanaPanelId,
        from: `now-${panel.timeRange || '5m'}`,
        to: 'now',
        refresh: panel.refreshInterval || '',
        'var-device_ip': deviceIp,
        'var-application': application
      })
      return `${this.grafanaBaseUrl}?${p.toString()}`
    },

    getCustomGrafanaUrl(panel) {
      const { device, category, appName } = this.queryParams
      const q = (panel.promql || '')
        .replace(/\$\{device\}|\$device/g, device)
        .replace(/\$\{category\}|\$category/g, category)
        .replace(/\$\{appName\}|\$appName/g, appName)
      const panelIdMap = { graph: 1, timeseries: 1, stat: 2, gauge: 3, barchart: 4, table: 5 }
      const panelId = panelIdMap[panel.chartType] || 1
      const p = new URLSearchParams({
        orgId: 1, theme: 'light', panelId,
        from: `now-${panel.timeRange}`, to: 'now',
        refresh: panel.refreshInterval || '',
        'var-device': device, 'var-category': category, 'var-appName': appName,
        'var-query': q, 'var-title': panel.name
      })
      return `http://192.168.31.34:32556/d-solo/jars-custom-metrics/jars-custom-metrics?${p.toString()}`
    },

    openAddMetricDialog() {
      this.resetMetricForm()
      this.metricDialogVisible = true
    },

    editMetric(panel) {
      this.metricForm = { ...panel }
      this.metricDialogVisible = true
    },

    resetMetricForm() {
      this.metricForm = { id: null, name: '', promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'app' }
      this.$nextTick(() => { if (this.$refs.metricFormRef) this.$refs.metricFormRef.clearValidate() })
    },

    saveMetric() {
      this.$refs.metricFormRef.validate(async valid => {
        if (!valid) return
        const { device, category, appName } = this.queryParams
        const scopeDevice   = this.metricForm.scope === 'device'   ? device   : (this.metricForm.scope === 'global' ? 'All' : device)
        const scopeCategory = this.metricForm.scope === 'category' ? category : (this.metricForm.scope === 'global' ? 'All' : category)
        const scopeApp      = this.metricForm.scope === 'app'      ? appName  : 'All'

        if (this.metricForm.id) {
          const idx = this.customMetrics.findIndex(m => m.id === this.metricForm.id)
          if (idx !== -1) {
            this.$set(this.customMetrics, idx, { ...this.metricForm })
            await this.persistPanel(this.customMetrics[idx], scopeDevice, scopeCategory, scopeApp)
          }
          this.$message.success('指标已更新')
        } else {
          const m = { ...this.metricForm, id: 'custom_' + Date.now() }
          this.customMetrics.push(m)
          await this.persistPanel(m, scopeDevice, scopeCategory, scopeApp)
          this.$message.success('指标已添加')
        }
        this.metricDialogVisible = false
      })
    },

    async persistPanel(panel, device, category, appName) {
      try {
        await saveJarsPanelConfig({
          device, category, appName,
          panelKey: panel.id, panelName: panel.name,
          isCustom: 1, promql: panel.promql,
          chartType: panel.chartType, unit: panel.unit,
          timeRange: panel.timeRange, refreshInterval: panel.refreshInterval,
          scope: panel.scope, sortOrder: panel.sortOrder || 0
        })
      } catch (e) {
        console.error('保存面板配置失败', e)
        this.$message.warning('配置保存失败')
      }
    },

    deleteMetric(id) {
      this.$confirm('确定要删除该监控指标吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
        .then(async () => {
          const panel = this.customMetrics.find(m => m.id === id)
          if (panel && panel.dbId) {
            try { await delJarsPanelConfig(panel.dbId) } catch (e) { console.error(e) }
          }
          this.customMetrics = this.customMetrics.filter(m => m.id !== id)
          this.$message.success('指标已删除')
        }).catch(() => {})
    },

    async queryProcessStatus(app) {
      this.processStatus = { isRunning: null, uptimeSeconds: null, uptimeText: '' }
      try {
        const baseUrl  = 'http://192.168.31.34:30090/api/v1'
        const deviceIp = app.ipAddress || ''
        const appName  = app.appName   || 'java'
        const filter   = `node_ip="${deviceIp}",groupname=~".*${appName}.*"`

        const [stateResp, startResp] = await Promise.all([
          fetch(`${baseUrl}/query?query=namedprocess_namegroup_num_procs{${filter}}`),
          fetch(`${baseUrl}/query?query=namedprocess_namegroup_oldest_start_time_seconds{${filter}}`)
        ])
        const stateData = await stateResp.json()
        const startData = await startResp.json()

        const numProcs = parseFloat((stateData?.data?.result?.[0]?.value?.[1]) || '0')
        this.processStatus.isRunning = numProcs > 0

        const startTs = parseFloat((startData?.data?.result?.[0]?.value?.[1]) || '0')
        if (startTs > 0) {
          const uptimeSec = Math.floor(Date.now() / 1000 - startTs)
          this.processStatus.uptimeSeconds = uptimeSec
          this.processStatus.uptimeText    = this.formatUptime(uptimeSec)
        }
      } catch (e) {
        console.warn('进程状态查询失败', e)
        this.processStatus.isRunning = false
      }
    },

    formatUptime(seconds) {
      if (seconds < 60)    return `${seconds} 秒`
      if (seconds < 3600)  return `${Math.floor(seconds / 60)} 分钟`
      if (seconds < 86400) {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${h} 小时 ${m} 分钟`
      }
      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      return `${d} 天 ${h} 小时`
    },

    async loadSavedConfig() {
      const { device, category, appName } = this.queryParams
      if (appName === 'All') return
      this.customMetrics = []
      this.defaultPanels = [
        { id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用',         isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_2', grafanaPanelId: 2, name: '内存使用（MB）',   isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_3', grafanaPanelId: 4, name: '线程数',           isCustom: false, timeRange: '5m', refreshInterval: '30s' },
        { id: 'default_4', grafanaPanelId: 3, name: '打开文件描述符数', isCustom: false, timeRange: '5m', refreshInterval: '30s' }
      ]
      try {
        // 按作用域从窄到宽加载：当前应用、当前分类、当前设备、全局
        const [r1, r2, r3, r4] = await Promise.all([
          listJarsPanelConfig({ device, category, appName }),
          listJarsPanelConfig({ device, category, appName: 'All' }),
          listJarsPanelConfig({ device, category: 'All', appName: 'All' }),
          listJarsPanelConfig({ device: 'All', category: 'All', appName: 'All' })
        ])
        const seen = new Set(), all = []
        for (const r of [r1, r2, r3, r4]) {
          if (r.code === 200 && Array.isArray(r.data)) {
            r.data.forEach(p => { if (!seen.has(p.panelKey)) { seen.add(p.panelKey); all.push(p) } })
          }
        }
        all.filter(p => p.isCustom === 0).forEach(d => {
          const i = this.defaultPanels.findIndex(p => p.id === d.panelKey)
          if (i !== -1) this.$set(this.defaultPanels, i, { ...this.defaultPanels[i], name: d.panelName, grafanaPanelId: d.grafanaPanelId, timeRange: d.timeRange, refreshInterval: d.refreshInterval, dbId: d.id })
        })
        this.customMetrics = all.filter(p => p.isCustom === 1).map(d => ({
          id: d.panelKey, dbId: d.id, name: d.panelName, isCustom: true,
          promql: d.promql, chartType: d.chartType, unit: d.unit,
          timeRange: d.timeRange, refreshInterval: d.refreshInterval,
          sortOrder: d.sortOrder, scope: d.scope || 'app'
        }))
      } catch (e) {
        console.error('加载面板配置失败', e)
      }
    }
  }
}
</script>

<style scoped>
.jars-monitor { background-color: #f8fafc; min-height: calc(100vh - 84px); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-title { font-size: 18px; font-weight: bold; color: #303133; }
.filter-card { margin-bottom: 10px; background-color: #fcfcfc; }

.app-info-card { margin-bottom: 12px; border-top: 3px solid #409eff; }
.app-info-header { display: flex; align-items: center; }
.info-row { display: flex; align-items: baseline; margin-bottom: 8px; }
.info-label { font-size: 12px; color: #909399; font-weight: bold; min-width: 72px; flex-shrink: 0; }
.info-value { font-size: 13px; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
.code-text { font-family: 'Fira Mono', 'Consolas', monospace; background: #f4f4f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }

.stats-card { margin-bottom: 15px; border-top: 3px solid #1890ff; }
.stat-item { text-align: center; border-right: 1px solid #f0f0f0; min-height: 50px; padding: 6px 0; }
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 11px; color: #999; font-weight: bold; margin-bottom: 5px; white-space: nowrap; }
.stat-value { font-size: 16px; font-weight: bold; }
.text-blue { color: #1890ff; }
.text-black { color: #303133; }

.empty-state { text-align: center; padding: 60px 0; color: #c0c4cc; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

/* fade-slide transition for app info card */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.25s ease; }
.fade-slide-enter, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
