<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px">
      <el-form-item label="命名空间" prop="namespace">
        <el-select v-model="queryParams.namespace" placeholder="请选择命名空间" clearable @change="handleQuery" style="width: 200px">
          <el-option
            v-for="item in namespaceOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="所在节点" prop="nodeName">
        <el-select v-model="queryParams.nodeName" placeholder="请选择节点" clearable @change="handleQuery" style="width: 200px">
          <el-option
            v-for="item in nodeOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="podList" border>
      <el-table-column label="Pod 名称" prop="name" min-width="250" show-overflow-tooltip />
      <el-table-column label="命名空间" prop="namespace" width="150" align="center" />
      <el-table-column label="IP 地址" prop="podIp" width="140" align="center" />
      <el-table-column label="所在节点" prop="nodeName" width="150" align="center" />
      <el-table-column label="运行状态" prop="status" width="120" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="重启次数" prop="restartCount" width="100" align="center">
        <template #default="scope">
          <span :style="{ color: scope.row.restartCount > 5 ? 'red' : 'inherit' }">{{ scope.row.restartCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="creationTimestamp" width="180" align="center" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="120">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">详情监控</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup name="KubernetesMonitor">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listPods } from '@/api/monitor/kuber/pod'
import { getNamespaces, getNodes } from '@/api/monitor/kuber/common'

const router = useRouter()
const loading = ref(true)
const showSearch = ref(true)
const podList = ref([])

// 新增：下拉框的数据源
const namespaceOptions = ref([])
const nodeOptions = ref([])

const queryParams = ref({
  namespace: '',
  nodeName: ''
})

// 加载下拉框数据
const loadOptions = () => {
  getNamespaces().then(res => {
    namespaceOptions.value = res.data
  })
  getNodes().then(res => {
    nodeOptions.value = res.data
  })
}

// 获取表格列表数据
const getList = () => {
  loading.value = true
  listPods(queryParams.value).then(response => {
    podList.value = response.data
    loading.value = false
  }).catch(() => { loading.value = false })
}

const handleQuery = () => { getList() }

const resetQuery = () => {
  queryParams.value = { namespace: '', nodeName: '' }
  handleQuery()
}

const getStatusType = (status) => {
  if (status === 'Running') return 'success'
  if (status === 'Pending') return 'warning'
  if (status === 'Failed' || status === 'CrashLoopBackOff' || status === 'Error') return 'danger'
  return 'info'
}

const handleDetail = (row) => {
  router.push({
    path: '/monitor/kubernetes/pod-detail',
    query: { namespace: row.namespace, podName: row.name }
  })
}

onMounted(() => {
  loadOptions() // 进页面先拉取下拉框数据
  getList()     // 然后拉取表格数据
})
</script>