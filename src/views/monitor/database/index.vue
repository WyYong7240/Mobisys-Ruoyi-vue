<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧 -->
      <el-col :span="4">
        <!-- 数据库列表 -->
        <el-card shadow="never" class="mb20">
          <template #header>数据库列表</template>

          <el-tree
            :data="dbTree"
            node-key="id"
            default-expand-all
            :props="defaultProps"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <span>{{ data.label }}</span>

                <!-- 状态点（仅实例） -->
                <span
                  v-if="!data.children"
                  class="status-dot"
                  :class="data.status === 0 ? 'status-online' : 'status-offline'"
                />
              </div>
            </template>
          </el-tree>
        </el-card>

        <!-- 维度列表（仅选中数据库后显示） -->
        <el-card shadow="never" v-if="dbInfo.name">
          <template #header>监控维度</template>
          <div
            v-for="dim in dimensionList"
            :key="dim.key"
            class="dim-item"
            @click="scrollToSection(dim.key)"
          >
            {{ dim.name }}
          </div>
        </el-card>
      </el-col>

      <!-- 右侧 -->
      <el-col :span="20">
        <div class="right-container" ref="rightContainer">

          <!-- ================= 全局概览 ================= -->
          <el-card shadow="never" class="mb20">
            <template #header>系统概览</template>

            <el-row :gutter="20">
              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="overview-title">数据库总数</div>
                  <div class="overview-value">{{ totalDb }}</div>
                </el-card>
              </el-col>

              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="overview-title">正常实例</div>
                  <div class="overview-value success">{{ normalDb }}</div>
                </el-card>
              </el-col>

              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="overview-title">异常实例</div>
                  <div class="overview-value danger">{{ abnormalDb }}</div>
                </el-card>
              </el-col>

              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="overview-title">当前实例状态</div>
                  <div class="overview-value">
                    <span v-if="dbInfo.name">
                      {{ currentStatus === 0 ? '🟢 正常' : '🔴 禁用' }}
                    </span>
                    <span v-else>未选择</span>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </el-card>

          <!-- ================= 未选择数据库：维度概览 ================= -->
          <el-card v-if="!dbInfo.name" shadow="never" class="mb20">
            <template #header>监控维度概览</template>

            <el-row :gutter="20">
              <el-col
                :span="8"
                v-for="dim in dimensionList"
                :key="dim.key"
              >
                <el-card shadow="hover" class="dimension-card">
                  <div class="dimension-title">{{ dim.name }}</div>
                  <div class="dimension-desc">
                    <template v-if="dim.key === 'basic'">
                      基础资源监控：CPU、内存、网络、运行时长等
                    </template>
                    <template v-else-if="dim.key === 'db'">
                      数据库性能：QPS、连接数、慢查询、扫描等
                    </template>
                    <template v-else-if="dim.key === 'storage'">
                      存储相关指标：文件、表缓存等
                    </template>
                    <template v-else-if="dim.key === 'exception'">
                      异常监控：锁、连接异常等
                    </template>
                    <template v-else-if="dim.key === 'replication'">
                      复制延迟监控
                    </template>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </el-card>

          <!-- ================= 已选择数据库 ================= -->
          <template v-else>

            <!-- 基础信息 -->
            <el-card shadow="never" class="mb20">
              <template #header>数据库基础信息</template>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="类型">{{ dbInfo.type }}</el-descriptions-item>
                <el-descriptions-item label="名称">{{ dbInfo.name }}</el-descriptions-item>
                <el-descriptions-item label="版本">{{ dbInfo.version }}</el-descriptions-item>
                <el-descriptions-item label="IP">{{ dbInfo.ip }}</el-descriptions-item>
                <el-descriptions-item label="端口">{{ dbInfo.port }}</el-descriptions-item>
                <el-descriptions-item label="用户">{{ dbInfo.user }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 告警指南 & 生成PromQL (多指标重构版 + 收起/展开功能) -->
            <el-card shadow="never" class="mb20">
              <template #header>MySQL告警指南</template>

              <!-- 全局时间窗口选择器 -->
              <div class="global-range-selector">
                <span class="range-label">全局时间窗口 (rate区间):</span>
                <el-select v-model="globalRange" placeholder="请选择" style="width: 120px">
                  <el-option label="1分钟" value="1m" />
                  <el-option label="5分钟" value="5m" />
                  <el-option label="10分钟" value="10m" />
                  <el-option label="1小时" value="1h" />
                </el-select>
              </div>

              <!-- 遍历所有告警指标，每个指标独立阈值和生成按钮 -->
              <div
                v-for="alarm in alarmList"
                :key="alarm.key"
                class="alarm-item"
              >
                <div class="alarm-header">
                  <span class="alarm-name">{{ alarm.name }}</span>
                  <span class="alarm-desc">{{ alarm.desc }}</span>
                </div>

                <div class="alarm-controls">
                  <div class="threshold-control">
                    <span>阈值：</span>
                    <el-input-number
                      v-model="alarmThresholds[alarm.key]"
                      :min="0"
                      :step="alarm.step || 1"
                      :precision="alarm.precision || 0"
                      size="small"
                      style="width: 120px"
                    />
                    <span class="threshold-unit">{{ alarm.unit }}</span>
                  </div>
                  <el-button
                    type="primary"
                    size="small"
                    @click="generateForAlarm(alarm.key)"
                  >
                    生成 PromQL
                  </el-button>
                </div>

                <!-- PromQL 显示区域，支持收起/展开 -->
                <div v-if="showPromqlMap[alarm.key]" class="generated-promql">
                  <div class="promql-header">
                    <span>生成的 PromQL 语句</span>
                    <el-button type="text" size="small" @click="hidePromql(alarm.key)">
                      收起
                    </el-button>
                  </div>
                  <pre>{{ generatedPromqlMap[alarm.key] }}</pre>
                </div>
              </div>
            </el-card>

            <!-- 面板区域（完全保留你的原结构） -->
            <el-card shadow="never">
              <div
                v-for="dim in dimensionList"
                :key="dim.key"
                class="dimension-section"
                :ref="el => sectionRefs[dim.key] = el"
              >
                <div class="section-title">{{ dim.name }}</div>

                <el-row :gutter="16">
                  <el-col
                    :span="getPanelSpan(dim.key, panel.id)"
                    v-for="panel in panelGroup[dim.key]"
                    :key="panel.id"
                    style="margin-bottom: 20px"
                  >
                    <div class="iframe-container">
                      <div class="iframe-header">{{ panel.name }}</div>
                      <iframe
                        :src="getGrafanaUrl(panel.id)"
                        width="100%"
                        height="260"
                        frameborder="0"
                      />
                    </div>
                  </el-col>
                </el-row>
              </div>
            </el-card>

          </template>

        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from "vue"
import { listDatabase } from "@/api/device/database"
import { ElMessage } from "element-plus"

/* 左侧树 */
const dbTree = ref([])
const defaultProps = { children: "children", label: "label" }

/* 当前数据库 */
const dbInfo = reactive({
  type: "",
  name: "",
  ip: "",
  port: "",
  version: "",
  user: "",
  job: "",
  status: null
})

/* Grafana */
const grafanaBaseUrl =
  "http://192.168.31.34:32556/d-solo/549c2bf8936f7767ea6ac47c47b00f2a/mysql-exporter-quickstart-and-dashboard"

/* 维度（完全保留你的原始定义） */
const dimensionList = ref([
  { key: "basic", name: "基础资源" },
  { key: "db", name: "数据库性能" },
  { key: "storage", name: "存储空间" },
  { key: "exception", name: "异常监控" },
  { key: "replication", name: "复制延迟" }
])

/* 面板（完全保留你的原始 panelGroup） */
const panelGroup = {
  basic: [
    { id: 12, name: "运行时长 " },
    { id: 9, name: "网络流量监控 " },
    { id: 50, name: "内存使用监控 " }
  ],
  db: [
    { id: 13, name: "QPS 监控 " },
    { id: 92, name: "连接数监控 " },
    { id: 48, name: "慢查询监控 " },
    { id: 30, name: "排序操作监控 " },
    { id: 22, name: "临时对象监控 " },
    { id: 311, name: "全表扫描监控 " },
    { id: 10, name: "客户端线程活动监控 " },
    { id: 53, name: "数据库查询负载监控 " }
  ],
  storage: [
    { id: 43, name: "文件打开监控 " },
    { id: 41, name: "打开文件数监控 " },
    { id: 44, name: "表打开缓存监控 " },
    { id: 42, name: "打开表数监控 " },
    { id: 54, name: "表定义缓存监控 " },
    { id: 50, name: "内存缓存使用监控 " }
  ],
  replication: [],
  exception: [
    { id: 32, name: "表锁监控 " },
    { id: 47, name: "异常连接监控 " }
  ]
}

/* 锚点 */
const sectionRefs = reactive({})
const rightContainer = ref(null)

/* 概览统计 */
const totalDb = ref(0)
const normalDb = ref(0)
const abnormalDb = ref(0)

const currentStatus = computed(() => dbInfo.status)

/* 滚动 */
function scrollToSection(key) {
  const container = rightContainer.value
  const el = sectionRefs[key]
  if (container && el) {
    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top
    container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" })
  }
}

/* panel宽度（保留你的逻辑） */
function getPanelSpan(dimKey, panelId) {
  if (dimKey === "basic") {
    if (panelId === 12) return 8
    if (panelId === 9) return 16
    if (panelId === 50) return 24
  }
  return 12
}

/* Grafana */
const getGrafanaUrl = (panelId) => {
  if (!dbInfo.ip || !dbInfo.job) return ""
  const params = new URLSearchParams({
    orgId: 1,
    panelId,
    refresh: "5s",
    theme: "light",
    "var-job": dbInfo.job,
    "var-instance": `${dbInfo.ip}:${dbInfo.port}`
  })
  return `${grafanaBaseUrl}?${params.toString()}`
}

/* 点击数据库 */
function handleNodeClick(data) {
  if (data.children) return

  if (data.status === 1) {
    ElMessage.warning("该实例已禁用")
    return
  }

  dbInfo.type = data.type
  dbInfo.name = data.label
  dbInfo.ip = data.ip
  dbInfo.port = data.port
  dbInfo.version = "5.7"
  dbInfo.user = data.user
  dbInfo.job = data.job
  dbInfo.status = data.status
}

/* 获取树 + 统计 */
function getDbTree() {
  listDatabase().then(res => {
    const list = res.rows || []

    totalDb.value = list.length
    normalDb.value = list.filter(i => i.status === 0).length
    abnormalDb.value = list.filter(i => i.status === 1).length

    const children = list.map(item => ({
      id: item.databaseId,
      label: item.databaseName,
      ip: item.ipAddress,
      port: item.port,
      type: item.deviceId === 7 ? "MySQL" : "未知",
      version: item.version,
      user: item.username,
      job: item.username,
      status: item.status
    }))

    dbTree.value = [{ id: 1, label: "数据库", children }]
  })
}

/* ===================== 多指标告警生成逻辑（重构版 + 收起/展开） ===================== */
// 全局时间窗口（供所有rate类告警使用）
const globalRange = ref("1m")

// 存储每个告警的阈值（动态）
const alarmThresholds = reactive({})
// 存储每个告警生成的最终PromQL语句
const generatedPromqlMap = reactive({})
// 控制每个告警的PromQL区域是否显示
const showPromqlMap = reactive({})

// 告警指标定义（包含名称、描述、默认阈值、单位、模板、步长等）
const alarmList = ref([
  {
    key: "buffer_hit",
    name: "缓存利用率",
    desc: "缓存占用过高，可能存在内存瓶颈",
    defaultThreshold: 80,
    unit: "%",
    step: 1,
    precision: 0,
    // 该模板不依赖时间窗口，只做 job/instance 替换
    template: `(
  (
    (
      mysql_global_status_innodb_page_size{job=~"$job", instance=~"$instance"}
      * on(instance)
      mysql_global_status_buffer_pool_pages{job=~"$job", instance=~"$instance", state="data"}
    )
    + on(instance)
    mysql_global_variables_innodb_log_buffer_size{job=~"$job", instance=~"$instance"}
    + on(instance)
    mysql_global_variables_key_buffer_size{job=~"$job", instance=~"$instance"}
    + on(instance)
    mysql_global_variables_query_cache_size{job=~"$job", instance=~"$instance"}
  )
  /
  (
    mysql_global_variables_innodb_buffer_pool_size{job=~"$job", instance=~"$instance"}
    + on(instance)
    mysql_global_variables_innodb_log_buffer_size{job=~"$job", instance=~"$instance"}
    + on(instance)
    mysql_global_variables_key_buffer_size{job=~"$job", instance=~"$instance"}
    + on(instance)
    mysql_global_variables_query_cache_size{job=~"$job", instance=~"$instance"}
  )
  * 100
)`,
    // 是否需要替换时间窗口占位符
    needRangeReplace: false
  },
  {
    key: "lock_wait_ratio",
    name: "锁等待比例",
    desc: "表锁等待比例过高，可能存在锁争用",
    defaultThreshold: 10,
    unit: "%",
    step: 1,
    precision: 1,
    template: `(
  sum(rate(mysql_global_status_table_locks_waited{job=~"$job", instance=~"$instance"}[$range]))
  /
  (
    sum(rate(mysql_global_status_table_locks_immediate{job=~"$job", instance=~"$instance"}[$range]))
    +
    sum(rate(mysql_global_status_table_locks_waited{job=~"$job", instance=~"$instance"}[$range]))
  )
  * 100
)`,
    needRangeReplace: true
  },
  {
    key: "slow_queries",
    name: "慢查询数量",
    desc: "慢查询频率过高，需检查SQL性能",
    defaultThreshold: 5,
    unit: "次/秒",
    step: 0.1,
    precision: 1,
    template: `sum(rate(mysql_global_status_slow_queries{job=~"$job", instance=~"$instance"}[$range]))`,
    needRangeReplace: true
  },
  {
    key: "connection_usage",
    name: "连接池使用率",
    desc: "连接数占用过高，可能耗尽连接",
    defaultThreshold: 85,
    unit: "%",
    step: 1,
    precision: 0,
    template: `(
  sum(mysql_global_status_threads_connected{job=~"$job", instance=~"$instance"})
  /
  sum(mysql_global_variables_max_connections{job=~"$job", instance=~"$instance"})
) * 100`,
    needRangeReplace: false
  },
  {
    key: "qps",
    name: "QPS过高",
    desc: "每秒查询数过高，超出系统承载能力",
    defaultThreshold: 100,
    unit: "次/秒",
    step: 10,
    precision: 0,
    template: `rate(mysql_global_status_queries{job=~"$job", instance=~"$instance"}[$range])`,
    needRangeReplace: true
  }
])

// 初始化每个告警的默认阈值和显示状态
alarmList.value.forEach(alarm => {
  alarmThresholds[alarm.key] = alarm.defaultThreshold
  generatedPromqlMap[alarm.key] = ""
  showPromqlMap[alarm.key] = false  // 初始不显示
})

/**
 * 为单个告警生成最终的 PromQL 语句
 * @param {string} alarmKey 告警唯一标识
 */
function generateForAlarm(alarmKey) {
  // 校验是否已选择数据库实例
  if (!dbInfo.name) {
    ElMessage.warning("请先选择数据库实例")
    return
  }

  const alarm = alarmList.value.find(a => a.key === alarmKey)
  if (!alarm) return

  // 获取当前阈值
  const threshold = alarmThresholds[alarmKey]
  if (threshold === undefined || threshold === null) {
    ElMessage.warning(`${alarm.name} 阈值未设置`)
    return
  }

  let promql = alarm.template

  // 替换 job 和 instance 占位符
  promql = promql.replace(/\$job/g, dbInfo.job)
  promql = promql.replace(/\$instance/g, `${dbInfo.ip}:${dbInfo.port}`)

  // 如果该指标需要时间窗口替换，则替换 [$range] 占位符
  if (alarm.needRangeReplace) {
    promql = promql.replace(/\$range/g, globalRange.value)
  }

  // 最终拼接比较条件（大于阈值）
  const finalPromql = `${promql} > ${threshold}`

  // 存储生成的语句
  generatedPromqlMap[alarmKey] = finalPromql
  // 生成后自动显示 PromQL 区域
  showPromqlMap[alarmKey] = true

  ElMessage.success(`${alarm.name} PromQL 生成成功`)
}

/**
 * 隐藏指定告警的 PromQL 显示区域
 * @param {string} alarmKey
 */
function hidePromql(alarmKey) {
  showPromqlMap[alarmKey] = false
}

onMounted(() => {
  getDbTree()
})
</script>

<style scoped>
.mb20 {
  margin-bottom: 20px;
}

.right-container {
  height: calc(100vh - 20px);
  overflow-y: auto;
  padding-right: 10px;
}

/* tree */
.tree-node {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

/* 状态点 */
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-online {
  background: #52c41a;
}
.status-offline {
  background: #999999; /* 改成灰色 */
}

/* 概览 */
.overview-title {
  font-size: 14px;
  color: #666;
}
.overview-value {
  font-size: 22px;
  font-weight: bold;
  margin-top: 10px;
}
.success {
  color: #52c41a;
}
.danger {
  color: #ff4d4f;
}

/* 维度 */
.dim-item {
  padding: 8px;
  cursor: pointer;
}
.dim-item:hover {
  background: #f5f7fa;
}

/* 面板 */
.dimension-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin: 15px 0;
  border-left: 4px solid #409eff;
  padding-left: 8px;
}

.iframe-container {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.iframe-header {
  background: #f8fafc;
  padding: 8px;
  font-weight: bold;
  border-bottom: 1px solid #ebeef5;
}

/* 告警生成 (多指标样式) */
.global-range-selector {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f9fafc;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
.range-label {
  font-weight: 500;
  color: #1f2f3d;
}

.alarm-item {
  border: 1px solid #e9eef3;
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  transition: all 0.2s;
}
.alarm-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  border-color: #d0d7de;
}

.alarm-header {
  margin-bottom: 12px;
  border-left: 3px solid #409eff;
  padding-left: 12px;
}
.alarm-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-right: 12px;
}
.alarm-desc {
  font-size: 12px;
  color: #909399;
}

.alarm-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.threshold-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5a5e66;
}
.threshold-unit {
  margin-left: 4px;
  color: #909399;
}

.generated-promql {
  margin-top: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e6e9f0;
  overflow: hidden;
}
.promql-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #eef2f6;
  border-bottom: 1px solid #e2e6ec;
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
}
.generated-promql pre {
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #2c3e50;
  line-height: 1.5;
  background: #f5f7fa;
}
</style>