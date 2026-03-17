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

import { reactive, ref, onMounted } from "vue"
import { listDatabase } from "@/api/device/database"   // 后端数据库接口
import { queryPrometheus } from '@/api/monitor/prometheuse'
import { listDeviceManagerTree } from '@/api/device/master'
import "splitpanes/dist/splitpanes.css"


/**
 * 数据库树
 */
const dbTree = ref([])

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
  status: "",
  owner: "",
  createTime: ""
})


/**
 * grafana地址
 */
const grafanaUrl = ref("")


/**
 * 页面加载获取数据库列表
 */
function getDbTree() {

  listDatabase().then(res => {

    console.log('数据库列表数据:', res)
    
    const list = res.rows
    console.log('数据库列表:', list)

    const mysqlChildren = []

    list.forEach(item => {
        console.log('单个数据库项:', item)
        console.log('所有字段:', Object.keys(item))
        console.log('databaseName:', item.databaseName)
        console.log('databaseId:', item.databaseId)

        // 使用后端返回的grafanaUrl字段（驼峰命名）
        const grafanaUrl = item.grafanaUrl
        
        console.log('最终使用的Grafana URL:', grafanaUrl)
        
        mysqlChildren.push({
          id: item.databaseId,
          label: item.databaseName,
          type: "mysql",
          ip: item.ipAddress,
          port: item.port,
          version: item.version || "5.7",
          user: item.username,
          status: item.status,
          owner: item.leader,
          createTime: item.createTime,
          grafana: grafanaUrl
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
    dbInfo.owner = data.owner
    dbInfo.createTime = data.createTime

    grafanaUrl.value = data.grafana + "?orgId=1&refresh=5s"

  }

}


/**
 * 页面初始化
 */
onMounted(() => {
  getDbTree()
})

</script>

<style scoped>

.mb20{
  margin-bottom:20px;
}

</style>