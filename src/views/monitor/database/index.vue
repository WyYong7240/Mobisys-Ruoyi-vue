<template>
  <div class="app-container">

    <el-row :gutter="20">

      <!-- 左侧数据库树 -->
      <el-col :span="4">
        <el-card shadow="never">
          <template #header>
            <span>数据库列表</span>
          </template>

          <el-tree
            :data="dbTree"
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
            <span>数据库基础信息</span>
          </template>

          <el-descriptions :column="3" border>

            <el-descriptions-item label="数据库类型">
              {{ dbInfo.type }}
            </el-descriptions-item>

            <el-descriptions-item label="实例名称">
              {{ dbInfo.name }}
            </el-descriptions-item>

            <el-descriptions-item label="数据库版本">
              {{ dbInfo.version }}
            </el-descriptions-item>

            <el-descriptions-item label="IP地址">
              {{ dbInfo.ip }}
            </el-descriptions-item>

            <el-descriptions-item label="端口">
              {{ dbInfo.port }}
            </el-descriptions-item>

            <el-descriptions-item label="监控用户">
              {{ dbInfo.user }}
            </el-descriptions-item>

            <el-descriptions-item label="状态">
              <el-tag v-if="dbInfo.status === 0" type="success">正常</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="负责人">
              {{ dbInfo.owner }}
            </el-descriptions-item>

            <el-descriptions-item label="创建时间">
              {{ dbInfo.createTime }}
            </el-descriptions-item>

          </el-descriptions>
        </el-card>


        <!-- Grafana 面板 -->
        <el-card shadow="never">
          <template #header>
            <span>数据库实时监控</span>
          </template>

          <div v-if="dbInfo.name">
            <el-row :gutter="16">

              <el-col
                :span="8"
                v-for="panel in panelList"
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
          </div>

          <el-empty v-else description="请选择数据库实例" />

        </el-card>

      </el-col>

    </el-row>

  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue"
import { listDatabase } from "@/api/device/database"

/**
 * 数据库树
 */
const dbTree = ref([])

const defaultProps = {
  children: "children",
  label: "label"
}

/**
 * 数据库信息
 */
const dbInfo = reactive({
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
 * Grafana 配置
 */
const grafanaBaseUrl =
  "http://192.168.31.34:32556/d-solo/549c2bf8936f7767ea6ac47c47b00f2a/mysql-exporter-quickstart-and-dashboard"

/**
 * 面板列表（你提供的 panelId）
 */
const panelList = ref([
  { id: 12, name: "运行时间", desc: "数据库运行时长" },

  { id: 13, name: "QPS（每秒查询数）", desc: "数据库每秒处理的查询数量" },
  { id: 92, name: "连接数", desc: "当前数据库连接数" },

  { id: 51, name: "InnoDB缓冲池", desc: "Buffer Pool 使用情况" },
  { id: 50, name: "内存概览", desc: "MySQL 内部内存使用情况" },

  { id: 11, name: "线程缓存池", desc: "线程复用情况" },
  { id: 10, name: "客户端线程状态", desc: "客户端连接线程状态" },

  { id: 53, name: "客户端查询次数", desc: "客户端查询总量" },
  { id: 9, name: "网络流量", desc: "数据库网络收发情况" }


])

/**
 * 生成 Grafana URL
 */
const getGrafanaUrl = (panelId) => {
  if (!dbInfo.ip) return ""

  const params = new URLSearchParams({
    orgId: 1,
    panelId: panelId,
    refresh: "5s",
    theme: "light",
    "var-job": "mysql-exporter",
    "var-instance": `${dbInfo.ip}:${dbInfo.port}`  
  })

  return `${grafanaBaseUrl}?${params.toString()}`
}

/**
 * 获取数据库列表
 */
function getDbTree() {

  listDatabase().then(res => {

    const list = res.rows
    const mysqlChildren = []

    list.forEach(item => {

      mysqlChildren.push({
        id: item.databaseId,
        label: item.databaseName,
        type: "MySQL",
        ip: item.ipAddress,
        port: item.port,
        version: item.version || "5.7",
        user: item.username,
        status: item.status,
        owner: item.leader,
        createTime: item.createTime
      })

    })

    dbTree.value = [
      {
        id: 1,
        label: "MySQL",
        children: mysqlChildren
      }
    ]

  })
}

/**
 * 点击节点
 */
function handleNodeClick(data) {

  if (!data.children) {

    dbInfo.type = data.type
    dbInfo.name = data.label
    dbInfo.ip = data.ip
    dbInfo.port = data.port
    dbInfo.version = data.version
    dbInfo.user = data.user
    dbInfo.status = data.status
    dbInfo.owner = data.owner
    dbInfo.createTime = data.createTime

  }

}

onMounted(() => {
  getDbTree()
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
