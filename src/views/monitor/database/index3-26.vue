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
  dbInfo.version = data.version
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
  background: #ff4d4f;
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
</style>