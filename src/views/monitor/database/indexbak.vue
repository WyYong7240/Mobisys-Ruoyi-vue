```vue
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

      <!-- 右侧监控信息 -->
      <el-col :span="20">

        <!-- 数据库基础信息 -->
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

            <!-- 新增：数据库状态 -->
            <el-descriptions-item label="数据库状态">
              <el-tag :type="dbInfo.status == 0 ? 'success' : 'danger'">
                {{ dbInfo.status == 0 ? '正常' : '禁用' }}
              </el-tag>
            </el-descriptions-item>

            <!-- 新增：创建时间 -->
            <el-descriptions-item label="创建时间">
              {{ dbInfo.createTime }}
            </el-descriptions-item>

            <!-- 新增：负责人 -->
            <el-descriptions-item label="负责人">
              {{ dbInfo.owner }}
            </el-descriptions-item>

          </el-descriptions>
        </el-card>

        <!-- Grafana监控 -->
        <el-card shadow="never">
          <template #header>
            <span>数据库实时监控</span>
          </template>

          <iframe
            v-if="grafanaUrl"
            :src="grafanaUrl"
            width="100%"
            height="900"
            frameborder="0"
          />
        </el-card>

      </el-col>

    </el-row>

  </div>
</template>

<script setup>

import { reactive, ref } from "vue"

/**
 * 数据库树
 * 实际项目中可从后端获取
 */
const dbTree = ref([
  {
    id: 1,
    label: "MySQL",
    children: [
      {
        id: 11,
        label: "mysql_test1",
        type: "mysql",
        ip: "192.168.31.34",
        port: "3307",
        version: "5.7",
        user: "mysqld_exporter",
        status: 0,
        createTime: "2026-03-13 17:52:30",
        owner: "赵立",
        grafana:
          "http://192.168.31.34:32556/d/549c2bf8936f7767ea6ac47c47b00f2a/mysql-exporter-quickstart-and-dashboard"
      },
      {
        id: 12,
        label: "mysql_test2",
        type: "mysql",
        ip: "192.168.31.35",
        port: "3306",
        version: "8.0",
        user: "mysqld_exporter",
        status: 1,
        createTime: "2026-03-14 10:30:00",
        owner: "赵立",
        grafana:
          "http://192.168.31.34:32556/d/mysql2"
      }
    ]
  }
])

/**
 * tree配置
 */
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
  status: 0,
  createTime: "",
  owner: ""
})

/**
 * grafana地址
 */
const grafanaUrl = ref("")

/**
 * 点击数据库实例
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
    dbInfo.createTime = data.createTime
    dbInfo.owner = data.owner

    grafanaUrl.value = data.grafana + "?orgId=1&refresh=5s"
  }
}

</script>

<style scoped>

.mb20{
  margin-bottom:20px;
}

</style>
```
