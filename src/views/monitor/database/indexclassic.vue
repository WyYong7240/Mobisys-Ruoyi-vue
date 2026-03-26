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
          />
        </el-card>

        <!-- 维度列表 -->
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

      <!-- 右侧（独立滚动容器） -->
      <el-col :span="20">
        <div class="right-container" ref="rightContainer">
          <!-- 基础信息 -->
          <el-card shadow="never" class="mb20">
            <template #header>数据库基础信息</template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="类型">{{ dbInfo.type }}</el-descriptions-item>
              <el-descriptions-item label="名称">{{ dbInfo.name }}</el-descriptions-item>
              <el-descriptions-item label="版本">{{ dbInfo.version }}</el-descriptions-item>
              <el-descriptions-item label="IP">{{ dbInfo.ip }}</el-descriptions-item>
              <el-descriptions-item label="端口">{{ dbInfo.port }}</el-descriptions-item>
              <el-descriptions-item label="监控用户">{{ dbInfo.user }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 面板区域 -->
          <el-card shadow="never">
            <div v-if="dbInfo.name">
              <div
                v-for="dim in dimensionList"
                :key="dim.key"
                class="dimension-section"
                :ref="el => sectionRefs[dim.key] = el"
              >
                <!-- 维度标题 -->
                <div class="section-title">{{ dim.name }}</div>

                <!-- 面板 -->
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
            </div>
            <el-empty v-else description="请选择数据库实例" />
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue"
import { listDatabase } from "@/api/device/database"

/* 左侧树 */
const dbTree = ref([])
const defaultProps = {
  children: "children",
  label: "label"
}

/* 当前数据库 */
const dbInfo = reactive({
  type: "",
  name: "",
  ip: "",
  port: "",
  version: "",
  user: "",
  job: ""
})

/* Grafana */
const grafanaBaseUrl =
  "http://192.168.31.34:32556/d-solo/549c2bf8936f7767ea6ac47c47b00f2a/mysql-exporter-quickstart-and-dashboard"

/* 维度列表 - 按新的分类调整 */
const dimensionList = ref([
  { key: "basic", name: "基础资源" },
  { key: "db", name: "数据库性能" },
  { key: "storage", name: "存储空间" },
  { key: "exception", name: "异常监控" } ,// 替换原有的锁与等待
  { key: "replication", name: "复制延迟" }
])

/* panel 分组 - 严格按排版要求配置顺序 */
const panelGroup = {
  // 基础资源：1,2放一排  3放一排
  basic: [
    { id: 12, name: "运行时长 " },
    { id: 9, name: "网络流量监控 " },
    { id: 50, name: "内存使用监控 " }
  ],
  // 数据库性能：1,2放一排  3,5放一排  4,6放一排 7,8放一排
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
  // 存储空间：3,4放一排 1,5 放一排 2,6放一排
  storage: [
    { id: 43, name: "文件打开监控 " },
    { id: 41, name: "打开文件数监控 " },
    { id: 44, name: "表打开缓存监控 " },
    { id: 42, name: "打开表数监控 " },
    { id: 54, name: "表定义缓存监控 " },
    { id: 50, name: "内存缓存使用监控 " }
  ],
  // 复制延迟：无对应图表
  replication: [],
  // 异常监控：1,2放一排
  exception: [
    { id: 32, name: "表锁监控 " },
    { id: 47, name: "异常连接监控 " }
  ]
}

/* 锚点引用 */
const sectionRefs = reactive({})
const rightContainer = ref(null)

/* 点击维度 → 只滚右侧 */
function scrollToSection(key) {
  const container = rightContainer.value
  const el = sectionRefs[key]
  if (container && el) {
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - containerRect.top
    container.scrollTo({
      top: container.scrollTop + offset,
      behavior: "smooth"
    })
  }
}

/* 获取面板宽度占比（仅调整基础资源维度） */
function getPanelSpan(dimKey, panelId) {
  // 基础资源维度特殊处理
  if (dimKey === "basic") {
    switch (panelId) {
      case 12: // 运行时长
        return 8; // 1/3 宽度（24/3=8）
      case 9:  // 网络流量监控
        return 16; // 2/3 宽度（24*2/3=16）
      case 50: // 内存使用监控
        return 24; // 整行宽度
      default:
        return 12;
    }
  }
  // 其他维度保持原有12的占比
  return 12;
}

/* Grafana URL */
const getGrafanaUrl = (panelId) => {
  if (!dbInfo.ip || !dbInfo.job) return ""
  const params = new URLSearchParams({
    orgId: 1,
    panelId: panelId,
    refresh: "5s",
    theme: "light",
    "var-job": dbInfo.job,
    "var-instance": `${dbInfo.ip}:${dbInfo.port}`
  })
  return `${grafanaBaseUrl}?${params.toString()}`
}

/* 点击数据库 */
function handleNodeClick(data) {
  if (!data.children) {
    dbInfo.type = data.type
    dbInfo.name = data.label
    dbInfo.ip = data.ip
    dbInfo.port = data.port
    dbInfo.version = data.version
    dbInfo.user = data.user
    dbInfo.job = data.job
  }
}

/* 获取数据库树 */
function getDbTree() {
  listDatabase().then(res => {
    const list = res.rows
    const children = []
    list.forEach(item => {
      children.push({
        id: item.databaseId,
        label: item.databaseName,
        type: item.deviceId === 7 ? "MySQL" : "未知",
        ip: item.ipAddress,
        port: item.port,
        version: item.version,
        user: item.username,
        job: item.username
      })
    })
    dbTree.value = [
      {
        id: 1,
        label: "数据库",
        children: children
      }
    ]
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

.dim-item {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.dim-item:hover {
  background: #f5f7fa;
}

/* 右侧独立滚动 */
.right-container {
  height: calc(100vh - 20px);
  overflow-y: auto;
  padding-right: 10px;
}

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