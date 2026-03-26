<template>
  <div class="app-container jars-monitor">

    <div class="page-header">
      <span class="page-title">Jars 应用监控</span>
      <div>
        <el-button-group style="margin-right:12px;">
          <el-button size="small" :type="panelCols === 2 ? 'primary' : ''" @click="panelCols = 2">2列</el-button>
          <el-button size="small" :type="panelCols === 4 ? 'primary' : ''" @click="panelCols = 4">4列</el-button>
        </el-button-group>
        <el-button size="small" type="primary" @click="openAddMetricDialog">＋新增自定义指标</el-button>
        <el-button size="small" @click="openGroupManagerDialog">管理分组</el-button>
      </div>
    </div>

    <div class="jars-body">
      <!-- 左侧应用导航树 -->
      <div class="app-nav-sidebar">
        <div class="nav-header">
          <span><i class="el-icon-menu" style="margin-right:5px;"></i>应用列表</span>
          <el-button circle size="mini" @click="refreshData" title="刷新">⟳</el-button>
        </div>
        <div class="nav-search">
          <el-input v-model="navSearch" placeholder="搜索应用..." size="mini" prefix-icon="el-icon-search" clearable />
        </div>
        <div class="nav-tree" v-loading="appsLoading">
          <div v-for="device in navTree" :key="device.ip" class="nav-device-block">
            <div class="nav-device-label" @click="toggleNavDevice(device.ip)">
              <span class="nav-arrow">{{ collapsedNavDevices[device.ip] ? '▶' : '▼' }}</span>
              <span class="icon-text">🖥</span>
              <span class="nav-device-ip" :title="device.ip">{{ device.ip }}</span>
              <span class="collapse-tip-mini">{{ collapsedNavDevices[device.ip] ? '展开' : '收起' }}</span>
            </div>
            <div v-show="!collapsedNavDevices[device.ip]">
              <div v-for="cat in device.categories" :key="cat.name" class="nav-category-block">
                <div class="nav-category-label" @click="toggleNavCategory(device.ip, cat.name)">
                  <span class="nav-arrow">{{ collapsedNavCategories[device.ip + '_' + cat.name] ? '▶' : '▼' }}</span>
                  <span class="icon-text">📁</span>
                  <span>{{ cat.name }}</span>
                  <span class="nav-count">{{ cat.apps.length }}</span>
                  <span class="collapse-tip-mini">{{ collapsedNavCategories[device.ip + '_' + cat.name] ? '展开' : '收起' }}</span>
                </div>
                <div v-show="!collapsedNavCategories[device.ip + '_' + cat.name]">
                  <div
                    v-for="app in cat.apps"
                    :key="app.appName"
                    class="nav-app-item"
                    :class="{ active: queryParams.appName === app.appName && queryParams.device === app.ipAddress }"
                    @click="selectAppFromNav(app)"
                  >
                    <i class="el-icon-s-tools" style="margin-right:4px;"></i>
                    <span class="nav-app-name" :title="app.appName">{{ app.appName }}</span>
                    <span class="nav-status-dot" :class="getNavStatusClass(app)"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="navTree.length === 0 && !appsLoading" class="nav-empty">暂无应用</div>
        </div>
      </div>

      <!-- 右侧主内容 -->
      <div class="jars-main">

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
          <el-button @click="refreshData">⟳刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <transition name="fade-slide">
      <el-card v-if="currentApp" shadow="never" class="app-info-card">
        <template #header>
          <div class="app-info-header">
            <i class="el-icon-s-platform" style="color:#409eff;margin-right:6px"></i>
            <span style="font-weight:bold">{{ currentApp.appName }}</span>
          </div>
        </template>
        <el-descriptions class="app-desc" :column="3" border size="small">
          <el-descriptions-item label="中文名称">
            {{ currentApp.appNameCn || '-' }}
          </el-descriptions-item>
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


    <div v-for="(group, groupIdx) in panelGroups" :key="group.name" class="panel-group-block">
      <el-card shadow="never" class="panel-group-card">
        <template #header>
          <div class="panel-group-header">
            <div class="panel-group-left" @click="toggleGroup(group.name)">
              <span class="panel-group-arrow">{{ collapsedGroups[group.name] ? '▶' : '▼' }}</span>
              <span class="panel-group-title">{{ group.name }}</span>
              <span class="panel-group-count">{{ group.panels.length }} 个面板</span>
            </div>
            <div class="panel-group-right" @click.stop>
              <span class="sort-label">分组序号</span>
              <el-input-number
                v-model="group.groupSortOrder"
                :min="0" :max="999" size="small"
                controls-position="right"
                style="width:80px;"
                @change="saveGroupSort(group)"
              />
              <el-button size="small" :disabled="groupIdx === 0" @click="moveGroup(groupIdx, -1)">↑</el-button>
              <el-button size="small" :disabled="groupIdx === panelGroups.length - 1" @click="moveGroup(groupIdx, 1)">↓</el-button>
              <span class="collapse-tip" style="margin-left:8px;cursor:pointer;" @click="toggleGroup(group.name)">
                {{ collapsedGroups[group.name] ? '展开' : '收起' }}
              </span>
            </div>
          </div>
        </template>
        <el-row v-show="!collapsedGroups[group.name]" :gutter="15">
          <el-col :span="getPanelSpan(panel)" v-for="panel in group.panels" :key="panel.id" style="margin-bottom:15px;">
            <el-card shadow="hover" :body-style="'padding:0;height:' + getPanelIframeHeight(panel) + 'px;overflow:hidden;'">
              <template #header>
                <div class="panel-card-header">
                  <el-tooltip :content="getPanelDescription(panel)" placement="top" effect="dark" :show-after="150">
                    <span class="panel-card-title">
                      <span class="panel-metric-icon" :class="getPanelIconClass(panel)">{{ getPanelIconChar(panel) }}</span>
                      <span class="panel-name-text">{{ panel.name }}</span>
                      <span class="panel-info-icon">?</span>
                    </span>
                  </el-tooltip>
                  <div class="panel-card-actions">
                    <el-button type="primary" link size="small" @click="editMetric(panel)">编辑</el-button>
                    <el-button v-if="panel.isCustom" type="danger" link size="small" @click="deleteMetric(panel.id)">删除</el-button>
                  </div>
                </div>
              </template>
              <iframe :src="panel.isCustom ? getCustomGrafanaUrl(panel) : getGrafanaUrl(panel)" width="100%" :height="getPanelIframeHeight(panel) + 10" frameborder="0" scrolling="no" style="margin-top:-10px;display:block;"></iframe>
            </el-card>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <div v-if="allPanels.length === 0 && !appsLoading" class="empty-state">
      <i class="el-icon-data-analysis empty-icon"></i>
      <p>暂无监控面板，请先选择具体应用或添加自定义指标</p>
    </div>

      </div><!-- /jars-main -->
    </div><!-- /jars-body -->

    <!-- METRIC DIALOG -->
    <el-dialog :title="metricForm.id ? '编辑自定义指标' : '新增自定义指标'" v-model="metricDialogVisible" width="660px" @close="resetMetricForm">
      <el-form :model="metricForm" :rules="metricRules" ref="metricFormRef" label-width="120px">
        <el-form-item label="指标名称" prop="name">
          <el-input v-model="metricForm.name" placeholder="如：JVM堆内存"></el-input>
        </el-form-item>
        <el-form-item label="指标描述">
          <el-input v-model="metricForm.description" type="textarea" :rows="3" placeholder="描述该指标的含义、作用及异常场景，如：监控JVM堆内存使用率，内存泄漏时该值会持续升高"></el-input>
        </el-form-item>
        <el-form-item label="面板分组" prop="panelGroup">
          <el-select v-model="metricForm.panelGroup" allow-create filterable placeholder="请选择或输入分组名" style="width:200px">
            <el-option v-for="g in allGroupNames" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="分组排序">
              <el-input-number v-model="metricForm.groupSortOrder" :min="0" :max="999" size="small" controls-position="right" style="width:110px;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面板排序">
              <el-input-number v-model="metricForm.sortOrder" :min="0" :max="999" size="small" controls-position="right" style="width:110px;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="面板宽度">
          <el-radio-group v-model="metricForm.panelSpan">
            <el-radio :label="6">1/4 宽</el-radio>
            <el-radio :label="8">1/3 宽</el-radio>
            <el-radio :label="12">1/2 宽</el-radio>
            <el-radio :label="24">全宽</el-radio>
          </el-radio-group>
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
            <el-option label="bar gauge LCD" value="bar gauge LCD"></el-option>
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

    <!-- 管理分组对话框 -->
    <el-dialog title="管理面板分组" v-model="groupManagerVisible" width="500px">
      <div style="margin-bottom:12px;">
        <el-input v-model="newGroupName" placeholder="输入新分组名称" style="width:300px;margin-right:8px;" />
        <el-button type="primary" @click="addGroup">添加分组</el-button>
      </div>
      <el-table :data="allGroupNames.map(g => ({ name: g }))" size="small">
        <el-table-column label="分组名称" prop="name" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="scope">
            <el-button type="danger" link size="small" @click="removeGroup(scope.row.name)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script>
import { listJarsApps, listJarsPanelConfig, saveJarsPanelConfig, delJarsPanelConfig, batchSortJarsPanels } from '@/api/monitor/jars'

export default {
  name: 'JarsMonitor',
  data() {
    return {
      grafanaBaseUrl: 'http://192.168.31.34:32556/d-solo/ce228ddf-bb69-4363-8a15-4cab4c51a5cf/petclinic-monitor',
      panelCols: 4,
      refreshKey: 0,
      appsLoading: false,
      allApps: [],
      collapsedGroups: {},       // { '分组名': true/false }
      collapsedNavDevices: {},
      collapsedNavCategories: {},
      appRuntimeMap: {},  // key: ip__appName, value: true(运行)/false(未运行)
      navSearch: '',
      groupManagerVisible: false,
      newGroupName: '',
      customGroupNames: [],      // 用户手动添加的分组名
      physicalNameMap: {},  // { physicalId: 'node1' }
      queryParams: { device: 'All', category: 'All', appName: 'All' },
      defaultPanels: [
        {
          id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          description: '展示应用进程的 CPU 使用情况与调度负载。CPU 持续升高或高位波动，可能表示计算压力增大或线程异常。'
        },
        {
          id: 'default_2', grafanaPanelId: 2, name: '内存使用（MB）', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          description: '展示应用/进程的内存占用（按 MB）。若内存持续增长且不回落，可能存在内存泄漏或缓存不断膨胀。'
        },
        {
          id: 'default_3', grafanaPanelId: 4, name: '线程数', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          description: '展示应用进程的线程数量。线程数异常增长，常见于线程泄漏、任务堆积或阻塞等待。'
        },
        {
          id: 'default_4', grafanaPanelId: 3, name: '打开文件描述符数', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          description: '展示进程打开的文件描述符数量。若持续升高可能存在未关闭文件或资源泄漏，接近上限会导致 I/O 错误。'
        }
      ],
      customMetrics: [],
      processStatus: {
        isRunning: null,
        uptimeSeconds: null,
        uptimeText: ''
      },
      metricDialogVisible: false,
      metricForm: { id: null, name: '', description: '', promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'app', panelGroup: 'default', sortOrder: 0, groupSortOrder: 0, panelSpan: 6 },
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
    },
    allGroupNames() {
      const fromPanels = this.allPanels.map(p => p.panelGroup || 'default')
      return [...new Set(['default', ...this.customGroupNames, ...fromPanels])]
    },
    panelGroups() {
      const map = {}
      this.allPanels.forEach(p => {
        const g = p.panelGroup || 'default'
        if (!map[g]) map[g] = { name: g, panels: [], groupSortOrder: 0 }
        map[g].panels.push(p)
        // 兼容同组内存在历史脏数据（比如默认面板=0，自定义面板>0）场景：取组内最大值作为当前分组排序
        map[g].groupSortOrder = Math.max(map[g].groupSortOrder || 0, Number(p.groupSortOrder || 0))
      })
      // 每组内的小面板按 sortOrder 排序
      Object.values(map).forEach(g => {
        g.panels.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      })
      // 大面板按 groupSortOrder 排序
      return Object.values(map).sort((a, b) => (a.groupSortOrder || 0) - (b.groupSortOrder || 0))
    },
    navTree() {
      const search = this.navSearch.trim().toLowerCase()
      const deviceMap = {}
      this.allApps.forEach(app => {
        if (search && !app.appName.toLowerCase().includes(search)) return
        const ip = app.ipAddress || app.device || '未知设备'
        const cat = app.category || 'default'
        if (!deviceMap[ip]) deviceMap[ip] = { ip, categories: {} }
        if (!deviceMap[ip].categories[cat]) deviceMap[ip].categories[cat] = { name: cat, apps: [] }
        deviceMap[ip].categories[cat].apps.push(app)
      })
      return Object.values(deviceMap).map(d => ({
        ip: d.ip,
        categories: Object.values(d.categories)
      }))
    },
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
          appNameCn: item.appNameCn,
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
          enabled: Number(item.status) === 0, // 0=启用(按你现有逻辑)
          startCmd:    item.deployPath ? `java ${item.jvmArgs || ''} -jar ${item.deployPath}`.trim() : '-',
          workDir:     item.deployPath ? item.deployPath.substring(0, item.deployPath.lastIndexOf('/') + 1) : '-',
          resourceLimit: item.jvmArgs || '-',
          
        }))
        await this.refreshAllAppRuntimeStatus()
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
      const unit = panel.unit || 'none'
      const q = (panel.promql || '')
        .replace(/\$\{device\}|\$device/g, device)
        .replace(/\$\{category\}|\$category/g, category)
        .replace(/\$\{appName\}|\$appName/g, appName)
        .replace(/\$\{unit\}|\$unit/g, unit)
      const panelIdMap = { graph: 1, timeseries: 1, stat: 2, gauge: 3, barchart: 4, 'bar gauge LCD': 6, table: 5 }
      const panelId = panelIdMap[panel.chartType] || 1
      const p = new URLSearchParams({
        orgId: 1, theme: 'light', panelId,
        from: `now-${panel.timeRange}`, to: 'now',
        refresh: panel.refreshInterval || '',
        'var-device': device, 'var-category': category, 'var-appName': appName,
        'var-query': q, 'var-unit': unit, 'var-title': panel.name
      })
      return `http://192.168.31.34:32556/d-solo/jars-custom-metrics/jars-custom-metrics?${p.toString()}`
    },

    openAddMetricDialog() {
      this.resetMetricForm()
      this.metricDialogVisible = true
    },

    editMetric(panel) {
      // 把 dbId 也带入 metricForm，保存时 persistPanel 需要用它做 upsert
      this.metricForm = {
        ...panel,
        // panelSpan/sortOrder/groupSortOrder 取面板当前运行时最新值
        panelSpan:      panel.panelSpan      || 6,
        sortOrder:      panel.sortOrder      || 0,
        groupSortOrder: panel.groupSortOrder || 0,
      }
      this.metricDialogVisible = true
    },

    resetMetricForm() {
      this.metricForm = { id: null, name: '', description: '', promql: '', chartType: 'graph', unit: 'none', timeRange: '5m', refreshInterval: '30s', isCustom: true, scope: 'app', panelGroup: 'default', sortOrder: 0, groupSortOrder: 0, panelSpan: 6 }
      this.$nextTick(() => { if (this.$refs.metricFormRef) this.$refs.metricFormRef.clearValidate() })
    },

    getAppKey(app) {
      return `${app.ipAddress || ''}__${app.appName || ''}`
    },

    async refreshAllAppRuntimeStatus() {
      const baseUrl = 'http://192.168.31.34:30090/api/v1'
      const runtime = {}

      await Promise.all(
        this.allApps.map(async (app) => {
          const key = this.getAppKey(app)

          // 未启用：不查运行态，交给灰色显示
          if (!app.enabled) {
            runtime[key] = false
            return
          }

          try {
            const deviceIp = app.ipAddress || ''
            const appName = app.appName || 'java'
            const filter = `node_ip="${deviceIp}",groupname=~".*${appName}.*"`
            const resp = await fetch(`${baseUrl}/query?query=namedprocess_namegroup_num_procs{${filter}}`)
            const data = await resp.json()
            const numProcs = parseFloat((data?.data?.result?.[0]?.value?.[1]) || '0')
            runtime[key] = numProcs > 0
          } catch (e) {
            runtime[key] = false
          }
        })
      )

      this.appRuntimeMap = runtime
    },

    getNavStatusClass(app) {
      if (!app.enabled) return 'dot-grey'
      const running = this.appRuntimeMap[this.getAppKey(app)]
      return running ? 'dot-green' : 'dot-red'
    },

    saveMetric() {
      this.$refs.metricFormRef.validate(async valid => {
        if (!valid) return
        const { device, category, appName } = this.queryParams
        const scopeDevice   = this.metricForm.scope === 'device'   ? device
                    : this.metricForm.scope === 'global'    ? 'All'
                    : this.metricForm.scope === 'category'  ? 'All'   // category 级别不绑定具体设备
                    : device   // scope === 'app'

        const scopeCategory = this.metricForm.scope === 'global'   ? 'All'
                    : this.metricForm.scope === 'device'    ? 'All'   // device 级别不绑定具体分类
                    : category

        const scopeApp      = this.metricForm.scope === 'app' ? appName : 'All'

        if (this.metricForm.id) {
          const idx = this.customMetrics.findIndex(m => m.id === this.metricForm.id)
          if (idx !== -1) {
            // 保留运行时已更新的排序值，不被 metricForm 快照覆盖
            const existing = this.customMetrics[idx]
            this.customMetrics[idx] = {
              ...this.metricForm,
              dbId:           existing.dbId,
              sortOrder:      this.metricForm.sortOrder      !== undefined ? this.metricForm.sortOrder      : existing.sortOrder,
              groupSortOrder: this.metricForm.groupSortOrder !== undefined ? this.metricForm.groupSortOrder : existing.groupSortOrder,
              panelSpan:      this.metricForm.panelSpan      !== undefined ? this.metricForm.panelSpan      : existing.panelSpan,
            }
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
          id: panel.dbId || null,
          device, category, appName,
          panelKey: panel.id, panelName: panel.name,
          isCustom: 1, promql: panel.promql,
          chartType: panel.chartType, unit: panel.unit,
          timeRange: panel.timeRange, refreshInterval: panel.refreshInterval,
          scope: panel.scope, sortOrder: panel.sortOrder || 0,
          groupSortOrder: panel.groupSortOrder || 0,
          panelSpan: panel.panelSpan || 6,
          panelGroup: panel.panelGroup || 'default',
          description: panel.description || '',
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

    getPanelIconChar(panel) {
      if (panel.isCustom) return '⚙'
      const charMap = {
        'default_1': '⚡',
        'default_2': '💾',
        'default_3': '🔗',
        'default_4': '📄'
      }
      return charMap[panel.id] || '📊'
    },

    getPanelIconClass(panel) {
      if (panel.isCustom) return 'icon-custom'
      const classMap = {
        'default_1': 'icon-cpu',
        'default_2': 'icon-mem',
        'default_3': 'icon-thread',
        'default_4': 'icon-fd'
      }
      return classMap[panel.id] || 'icon-custom'
    },

    getPanelDescription(panel) {
      if (!panel) return '暂无描述信息'
      if (panel.description) return panel.description
      // 默认内置面板的描述兜底（避免历史配置/接口未返回 description）
      const byGrafanaId = {
        1: '展示应用进程的 CPU 使用情况与调度负载。CPU 持续升高或高位波动，可能表示计算压力增大或线程异常。',
        2: '展示应用/进程的内存占用（按 MB）。若内存持续增长且不回落，可能存在内存泄漏或缓存不断膨胀。',
        4: '展示应用进程的线程数量。线程数异常增长，常见于线程泄漏、任务堆积或阻塞等待。',
        3: '展示进程打开的文件描述符数量。若持续升高可能存在未关闭文件或资源泄漏，接近上限会导致 I/O 错误。'
      }
      return byGrafanaId[panel.grafanaPanelId] || '暂无描述信息'
    },

    async loadSavedConfig() {
      const { device, category, appName } = this.queryParams
      this.customMetrics = []
      this.defaultPanels = [
        {
          id: 'default_1', grafanaPanelId: 1, name: 'CPU 使用', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          sortOrder: 0, groupSortOrder: 0, panelSpan: 6, panelGroup: 'default',
          description: '展示应用进程的 CPU 使用情况与调度负载。CPU 持续升高或高位波动，可能表示计算压力增大或线程异常。'
        },
        {
          id: 'default_2', grafanaPanelId: 2, name: '内存使用（MB）', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          sortOrder: 1, groupSortOrder: 0, panelSpan: 6, panelGroup: 'default',
          description: '展示应用/进程的内存占用（按 MB）。若内存持续增长且不回落，可能存在内存泄漏或缓存不断膨胀。'
        },
        {
          id: 'default_3', grafanaPanelId: 4, name: '线程数', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          sortOrder: 2, groupSortOrder: 0, panelSpan: 6, panelGroup: 'default',
          description: '展示应用进程的线程数量。线程数异常增长，常见于线程泄漏、任务堆积或阻塞等待。'
        },
        {
          id: 'default_4', grafanaPanelId: 3, name: '打开文件描述符数', isCustom: false, timeRange: '5m', refreshInterval: '30s',
          sortOrder: 3, groupSortOrder: 0, panelSpan: 6, panelGroup: 'default',
          description: '展示进程打开的文件描述符数量。若持续升高可能存在未关闭文件或资源泄漏，接近上限会导致 I/O 错误。'
        }
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
          if (i !== -1) this.defaultPanels[i] = {
            ...this.defaultPanels[i],
            name: d.panelName,
            grafanaPanelId: d.grafanaPanelId,
            timeRange: d.timeRange,
            refreshInterval: d.refreshInterval,
            sortOrder: d.sortOrder || this.defaultPanels[i].sortOrder,
            groupSortOrder: d.groupSortOrder || 0,
            panelSpan: d.panelSpan || 6,
            dbId: d.id
          }
        })
        this.customMetrics = all.filter(p => p.isCustom === 1).map(d => ({
          id: d.panelKey, dbId: d.id, name: d.panelName, isCustom: true,
          promql: d.promql, chartType: d.chartType, unit: d.unit,
          timeRange: d.timeRange, refreshInterval: d.refreshInterval,
          sortOrder: d.sortOrder || 0, groupSortOrder: d.groupSortOrder || 0,
          panelSpan: d.panelSpan || 6,
          scope: d.scope || 'app',
          panelGroup: d.panelGroup || 'default',
          description: d.description || '',
        }))
      } catch (e) {
        console.error('加载面板配置失败', e)
      }
    },
        selectAppFromNav(app) {
      this.queryParams.device = app.ipAddress || app.device
      this.queryParams.category = app.category || 'default'
      this.queryParams.appName = app.appName
      this.loadSavedConfig()
      this.refreshKey++
    },
    toggleNavDevice(ip) {
      this.collapsedNavDevices[ip] = !this.collapsedNavDevices[ip]
    },
    toggleNavCategory(ip, cat) {
      const key = ip + '_' + cat
      this.collapsedNavCategories[key] = !this.collapsedNavCategories[key]
    },
    toggleGroup(name) {
      this.collapsedGroups[name] = !this.collapsedGroups[name]
    },
    openGroupManagerDialog() {
      this.groupManagerVisible = true
    },
    addGroup() {
      if (!this.newGroupName.trim()) return
      if (!this.customGroupNames.includes(this.newGroupName.trim())) {
        this.customGroupNames.push(this.newGroupName.trim())
      }
      this.newGroupName = ''
    },
    removeGroup(name) {
      if (name === 'default') { this.$message.warning('默认分组不能删除'); return }
      this.customGroupNames = this.customGroupNames.filter(g => g !== name)
    },

    // ===== 排序与宽度辅助方法 =====

    getPanelSpan(panel) {
      return panel.panelSpan || 6
    },

    getPanelIframeHeight(panel) {
      const span = panel.panelSpan || 6
      if (span === 24) return 360
      if (span === 12) return 300
      if (span === 8)  return 270
      return 240  // span=6, 1/4宽
    },

    // 大面板：点击上/下箭头，更新 groupSortOrder 并保存
    moveGroup(groupIdx, dir) {
      const groups = this.panelGroups
      const target = groups[groupIdx + dir]
      const current = groups[groupIdx]
      if (!target) return
      // 交换 groupSortOrder
      const tmp = current.groupSortOrder
      current.groupSortOrder = target.groupSortOrder
      target.groupSortOrder = tmp
      // 同步到 allPanels 中对应 panelGroup 的每条记录
      this.allPanels.forEach(p => {
        if (p.panelGroup === current.name) p.groupSortOrder = current.groupSortOrder
        if (p.panelGroup === target.name)  p.groupSortOrder = target.groupSortOrder
      })
      this.flushSortToServer()
    },

    // 大面板：输入框改变后保存
    saveGroupSort(group) {
      this.allPanels.forEach(p => {
        if (p.panelGroup === group.name) p.groupSortOrder = group.groupSortOrder
      })
      this.flushSortToServer()
    },

    // 小面板：上/下移动（同分组内）
    movePanelInGroup(group, panelIdx, dir) {
      const panels = group.panels
      const swapIdx = panelIdx + dir
      if (swapIdx < 0 || swapIdx >= panels.length) return
      const tmp = panels[panelIdx].sortOrder
      panels[panelIdx].sortOrder = panels[swapIdx].sortOrder
      panels[swapIdx].sortOrder = tmp
      // 若 sortOrder 相同则用 index 区分
      if (panels[panelIdx].sortOrder === panels[swapIdx].sortOrder) {
        panels[panelIdx].sortOrder = panelIdx
        panels[swapIdx].sortOrder = swapIdx
      }
      this.flushSortToServer()
    },

    // 小面板宽度改变后保存
    savePanelSpan(panel) {
      this.flushSortToServer()
    },

    // 将所有有 dbId 的面板的 sortOrder/groupSortOrder/panelSpan 批量写回后端
    async flushSortToServer() {
      const payload = this.allPanels
        .filter(p => p.dbId)
        .map(p => ({
          id: p.dbId,
          sortOrder: p.sortOrder || 0,
          groupSortOrder: p.groupSortOrder || 0,
          panelSpan: p.panelSpan || 6
        }))
      if (!payload.length) return
      try {
        await batchSortJarsPanels(payload)
      } catch (e) {
        console.error('保存排序失败', e)
      }
    },
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

.panel-group-block { margin-bottom: 16px; }
.panel-group-card { border-top: 3px solid #409eff; }
.panel-group-header {
  display: flex; justify-content: space-between; align-items: center;
  user-select: none;
}
.panel-group-left {
  display: flex; align-items: center; gap: 6px;
  cursor: pointer; flex: 1; min-width: 0;
}
.panel-group-arrow { font-size: 11px; color: #909399; flex-shrink: 0; }
.panel-group-title { font-size: 14px; font-weight: bold; color: #303133; }
.panel-group-count {
  font-size: 12px; color: #909399;
  background: #f0f2f5; border-radius: 10px;
  padding: 0 7px; line-height: 18px;
}
.panel-group-right {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.sort-label { font-size: 12px; color: #909399; white-space: nowrap; }

/* ===== Layout ===== */
.jars-body { display: flex; align-items: flex-start; gap: 12px; }
.jars-main { flex: 1; min-width: 0; }

/* ===== Nav Sidebar ===== */
.app-nav-sidebar {
  width: 200px; flex-shrink: 0; background: #fff;
  border: 1px solid #e4e7ed; border-radius: 4px;
  position: sticky; top: 0;
  max-height: calc(100vh - 120px);
  display: flex; flex-direction: column; overflow: hidden;
}
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 8px; font-size: 13px; font-weight: bold; color: #303133;
  border-bottom: 1px solid #ebeef5; background: #f5f7fa;
}
.nav-search { padding: 8px 8px 4px; }
.nav-tree { flex: 1; overflow-y: auto; padding: 4px 0 8px; }
.nav-device-block { margin-bottom: 2px; }
.nav-device-label {
  display: flex; align-items: center; padding: 5px 10px;
  font-size: 12px; font-weight: bold; color: #303133;
  cursor: pointer; user-select: none;
}
.nav-device-label:hover { background: #f0f4ff; }
.nav-device-ip { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.nav-category-block { margin-left: 8px; }
.nav-category-label {
  display: flex; align-items: center; padding: 4px 10px;
  font-size: 12px; color: #606266; cursor: pointer; user-select: none;
}
.nav-category-label:hover { background: #f5f7fa; }
.nav-count {
  margin-left: auto; font-size: 10px; background: #e9ecef; color: #909399;
  border-radius: 8px; padding: 0 5px; line-height: 16px;
}
.nav-app-item {
  display: flex; align-items: center; margin-left: 16px; padding: 4px 10px;
  font-size: 12px; color: #606266; cursor: pointer; border-radius: 3px; transition: background 0.15s;
}
.nav-app-item:hover { background: #ecf5ff; color: #409eff; }
.nav-app-item.active { background: #409eff; color: #fff; }
.nav-app-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-arrow { font-size: 10px; margin-right: 4px; flex-shrink: 0; }
.nav-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-left: 4px; }
.dot-green { background: #67c23a; }
.dot-grey  { background: #c0c4cc; }
.dot-red { background: #f56c6c; }
.nav-empty { text-align: center; color: #c0c4cc; font-size: 12px; padding: 20px 0; }

/* 右侧容器允许子项收缩，配合省略号 */
.jars-main {
  min-width: 0;
}

/* descriptions 固定布局，避免被长文本撑爆 */
.app-info-card :deep(.el-descriptions__body table) {
  width: 100%;
  table-layout: fixed;
}

/* descriptions 内容：单行 + 省略号 */
.app-info-card :deep(.el-descriptions-item__content) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: normal;
  overflow-wrap: normal;
}

/* 代码文本：单行 + 省略号 */
.code-text {
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* el-table 单元格：单行 + 省略号 */
:deep(.el-table .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.panel-desc-icon { color:#909399; font-size:13px; margin-left:4px; cursor:help; vertical-align:middle; }

/* ===== Panel Card Header ===== */
.panel-card-header {
  padding: 8px 15px;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-card-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  min-width: 0;
}
.panel-name-text {
  font-size: 13px;
  font-weight: bold;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.panel-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
  background: #dde1e7;
  color: #606266;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}
.panel-card-title:hover .panel-info-icon {
  background: #409eff;
  color: #fff;
}
.panel-card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ===== Panel Metric Icon Badge ===== */
.panel-metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  transition: transform 0.15s;
  user-select: none;
}
.panel-card-title:hover .panel-metric-icon {
  transform: scale(1.1);
}
.panel-metric-icon.icon-cpu    { background: #e8f4ff; color: #1890ff; }
.panel-metric-icon.icon-mem    { background: #f0f9eb; color: #67c23a; }
.panel-metric-icon.icon-thread { background: #fdf6ec; color: #e6a23c; }
.panel-metric-icon.icon-fd     { background: #fef0f0; color: #f56c6c; }
.panel-metric-icon.icon-custom { background: #f4f0ff; color: #7c3aed; }
</style>
