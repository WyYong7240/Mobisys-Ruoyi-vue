<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧中间件树 -->
      <el-col :span="4">
        <el-card shadow="never">
          <template #header>
            <span>中间件列表</span>
          </template>
          <el-tree
            :data="middlewareTree"
            node-key="id"
            default-expand-all
            :props="defaultProps"
            @node-click="handleNodeClick"
          />
        </el-card>
      </el-col>
      <!-- 右侧监控 -->
      <el-col :span="20">
        <!-- 基础信息 -->
        <el-card shadow="never" class="mb20">
          <template #header>
            <span>中间件基础信息</span>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="中间件类型">
              {{ middlewareInfo.type }}
            </el-descriptions-item>
            <el-descriptions-item label="实例名称">
              {{ middlewareInfo.name }}
            </el-descriptions-item>
            <el-descriptions-item label="版本">
              {{ middlewareInfo.version }}
            </el-descriptions-item>
            <el-descriptions-item label="IP地址">
              {{ middlewareInfo.ip }}
            </el-descriptions-item>
            <el-descriptions-item label="端口">
              {{ middlewareInfo.port }}
            </el-descriptions-item>
            <el-descriptions-item label="监控用户">
              {{ middlewareInfo.user }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag v-if="middlewareInfo.status === 0" type="success">正常</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="负责人">
              {{ middlewareInfo.owner }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ middlewareInfo.createTime }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        <!-- Grafana 面板 -->
        <el-card shadow="never">
          <template #header>
            <span>中间件实时监控</span>
          </template>
          <div v-if="middlewareInfo.name">
            <!-- Redis 特殊布局 -->
            <template v-if="middlewareInfo.type === 'Redis'">
              <!-- 第一行：Redis资源总览表占整行 -->
              <el-row :gutter="16" style="margin-bottom: 20px">
                <el-col :span="24">
                  <div class="iframe-container">
                    <div class="iframe-header">
                      Redis资源总览表
                      <el-tooltip content="Redis各项核心资源数值综合展示" placement="top">
                        <i class="el-icon-info" style="margin-left:6px;"></i>
                      </el-tooltip>
                    </div>
                    <iframe
                      :src="getGrafanaUrl(35)"
                      width="100%"
                      height="180"
                      frameborder="0"
                    />
                  </div>
                </el-col>
              </el-row>

              <!-- 第二行：命令执行平均耗时和命令总时长/秒各占一半 -->
              <el-row :gutter="16" style="margin-bottom: 20px">
                <el-col :span="12">
                  <div class="iframe-container">
                    <div class="iframe-header">
                      Redis 命令性能
                      <el-tooltip content="Redis单个命令执行的平均耗时统计" placement="top">
                        <i class="el-icon-info" style="margin-left:6px;"></i>
                      </el-tooltip>
                    </div>
                    <iframe
                      :src="getGrafanaUrl(20)"
                      width="100%"
                      height="300"
                      frameborder="0"
                    />
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="iframe-container">
                    <div class="iframe-header">
                      Redis 命令性能
                      <el-tooltip content="Redis每秒命令花费的总时长" placement="top">
                        <i class="el-icon-info" style="margin-left:6px;"></i>
                      </el-tooltip>
                    </div>
                    <iframe
                      :src="getGrafanaUrl(14)"
                      width="100%"
                      height="300"
                      frameborder="0"
                    />
                  </div>
                </el-col>
              </el-row>

              <!-- 第三行及以后：其余面板每行3个 -->
              <el-row :gutter="16">
                <el-col
                  :span="8"
                  v-for="panel in getRemainingRedisPanels()"
                  :key="panel.id"
                  style="margin-bottom: 20px"
                >
                  <div class="iframe-container">
                    <div class="iframe-header">
                      {{ panel.name }}
                      <el-tooltip :content="panel.desc" placement="top">
                        <i class="el-icon-info" style="margin-left:6px;"></i>
                      </el-tooltip>
                    </div>
                    <iframe
                      :src="getGrafanaUrl(panel.id)"
                      width="100%"
                      height="260"
                      frameborder="0"
                    />
                  </div>
                </el-col>
              </el-row>
            </template>

            <!-- RabbitMQ 和其他类型保持原有布局 -->
            <template v-else>
              <el-row :gutter="16">
                <el-col
                  :span="8"
                  v-for="panel in currentPanelList"
                  :key="panel.id"
                  style="margin-bottom: 20px"
                >
                  <div class="iframe-container">
                    <div class="iframe-header">
                      {{ panel.name }}
                      <el-tooltip :content="panel.desc" placement="top">
                        <i class="el-icon-info" style="margin-left:6px;"></i>
                      </el-tooltip>
                    </div>
                    <iframe
                      :src="getGrafanaUrl(panel.id)"
                      width="100%"
                      height="260"
                      frameborder="0"
                    />
                  </div>
                </el-col>
              </el-row>
            </template>
          </div>
          <el-empty v-else description="请选择中间件实例" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from "vue"
// 🔴 需修改：替换为你的中间件列表接口 (已改)
import { listMiddleware } from "@/api/device/middleware"

/**
 * 🔴 需修改：中间件类型映射（按你的设备ID配置） (已改)
 */
const middlewareTypeMap = {
  13: "Redis",
  14: "RabbitMQ"
}

/**
 * 中间件树结构
 */
const middlewareTree = ref([])
const defaultProps = {
  children: "children",
  label: "label"
}

/**
 * 中间件基础信息
 */
const middlewareInfo = reactive({
  type: "",
  name: "",
  ip: "",
  port: "",
  version: "",
  user: "",
  status: "",
  owner: "",
  createTime: ""
})

/**
 * 🔴 需修改：Grafana基础地址（替换为你画好的Redis/RabbitMQ面板地址）  (已改)
 */
const grafanaUrlConfig = {
  redis: "http://192.168.31.34:32556/d-solo/JIeHsmmYMk/redis-exporter-dashboard",
  rabbitmq: "http://192.168.31.34:32556/d-solo/bef39bef-859e-4f04-94b5-31bfe027e1e3/my-rabbitmqdashboard"
}

/**
 * 🔴 需修改：Grafana面板配置（替换为你画好的面板ID/名称/描述） (已改)
 */
const panelConfig = {
  // Redis监控面板
  redis: [
    { id: 35, name: "Redis资源总览表", desc: "Redis各项核心资源数值综合展示" },
    { id: 7, name: "Redis 资源监控", desc: "Redis内存占用与阈值" },
    { id: 10, name: "Redis 网络监控", desc: "Redis每秒网络接收和发送的流量统计" },
    { id: 16, name: "Redis 客户端连接", desc: "Redis连接与拒绝的客户端" },
    { id: 18, name: "Redis 命令性能", desc: "Redis每秒执行的命令操作总数统计" },
    { id: 5, name: "Redis 数据存储", desc: "Redis不同数据库中Key的数量及分布情况" },
    { id: 14, name: "Redis 命令性能", desc: "Redis每秒命令花费的总时长" },
    { id: 20, name: "Redis 命令性能", desc: "Redis单个命令执行的平均耗时统计" },
    { id: 13, name: "Redis 数据存储", desc: "Redis中过期Key和未过期Key的数量统计" }
  ],
  // RabbitMQ监控面板
  rabbitmq: [
    { id: 5, name: "MQ运行状态", desc: "RabbitMQ服务运行状态、运行时长及健康度" },
    { id: 1, name: "连接数", desc: "RabbitMQ当前客户端连接总数及连接详情" },
    { id: 2, name: "消费者数", desc: "RabbitMQ各队列消费者数量及分布" },
    { id: 3, name: "队列数", desc: "RabbitMQ创建的队列总数量及各队列状态" },
    { id: 4, name: "内存使用率", desc: "RabbitMQ占用内存大小及内存使用率" },
    { id: 6, name: "磁盘剩余", desc: "RabbitMQ所在磁盘剩余空间及使用率" },
      ]
}

/**
 * 动态获取当前选中中间件的面板列表
 */
const currentPanelList = computed(() => {
  if (middlewareInfo.type === "Redis") return panelConfig.redis
  if (middlewareInfo.type === "RabbitMQ") return panelConfig.rabbitmq
  return []
})

/**
 * 生成Grafana地址
 */
const getGrafanaUrl = (panelId) => {
  if (!middlewareInfo.ip) return ""
  let baseUrl = ""
  let jobName = ""
  if (middlewareInfo.type === "Redis") {
    baseUrl = grafanaUrlConfig.redis
    jobName = "redis-exporter"
  } else if (middlewareInfo.type === "RabbitMQ") {
    baseUrl = grafanaUrlConfig.rabbitmq
    jobName = "rabbitmq-exporter"
  }
  const params = new URLSearchParams({
    orgId: 1,
    panelId: panelId,
    refresh: "5s",
    theme: "light",
    "var-job": jobName,
    "var-instance": `${middlewareInfo.ip}:${middlewareInfo.port}`
  })
  return `${baseUrl}?${params.toString()}`
}

/**
 * 获取剩余的Redis面板（排除前三个特殊布局的面板）
 */
const getRemainingRedisPanels = () => {
  return panelConfig.redis.filter(panel => ![35, 20, 14].includes(panel.id))
}

/**
 * 获取面板列宽
 */
const getPanelSpan = (panelId) => {
  // Redis资源总览表占整行
  if (panelId === 35) return 24
  // 命令执行平均耗时和命令总时长/秒各占一半行
  if (panelId === 20 || panelId === 14) return 12
  // 其他面板每行3个
  return 8
}


/**
 * 获取中间件树（严格按你要求的三级结构）
 * 一级：中间件 → 二级：Redis/RabbitMQ → 三级：对应实例
 */
function getMiddlewareTree() {
  listMiddleware().then(res => {
    const list = res.rows || []
    console.log('接口返回数据:', list) // 🔍 调试：查看设备ID等字段

    // 按类型分组实例
    const redisInstances = []
    const rabbitmqInstances = []

    list.forEach(item => {
      const type = middlewareTypeMap[item.deviceId] || "未知类型"
      const instance = {
        id: item.middlewareId,
        label: item.middlewareName,
        type: type,
        ip: item.ipAddress,
        port: item.port,
        version: item.middlewareVersion,
        user: item.username,
        status: item.status,
        owner: item.leader,
        createTime: item.createTime
      }

      if (type === "Redis") {
        redisInstances.push(instance)
      } else if (type === "RabbitMQ") {
        rabbitmqInstances.push(instance)
      }
    })

    middlewareTree.value = [
      {
        id: 1,
        label: "中间件",
        children: [
          {
            id: 2,
            label: "缓存中间件",
            children: redisInstances
          },
          {
            id: 3,
            label: "消息队列中间件",
            children: rabbitmqInstances
          }
        ]
      }
    ]
  }).catch(error => {
    console.error('获取中间件列表失败:', error)
  })
}

/**
 * 点击树节点
 */
function handleNodeClick(data) {
  // 只响应三级实例节点
  if (!data.children && data.type) {
    middlewareInfo.type = data.type
    middlewareInfo.name = data.label
    middlewareInfo.ip = data.ip
    middlewareInfo.port = data.port
    middlewareInfo.version = data.version
    middlewareInfo.user = data.user
    middlewareInfo.status = data.status
    middlewareInfo.owner = data.owner
    middlewareInfo.createTime = data.createTime
  }
}

onMounted(() => {
  getMiddlewareTree()
})
</script>

<style scoped>
.mb20 {
  margin-bottom: 20px;
}
.iframe-container {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}
.iframe-header {
  background: #f8fafc;
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid #ebeef5;
}
</style>