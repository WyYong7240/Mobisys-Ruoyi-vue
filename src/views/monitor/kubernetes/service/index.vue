<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px">
      <el-form-item label="命名空间" prop="namespace">
        <el-select v-model="queryParams.namespace" placeholder="请选择命名空间" clearable @change="handleQuery" style="width: 200px">
          <el-option v-for="item in namespaceOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="success" plain icon="RefreshRight" @click="getList">刷新数据</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="serviceList" border class="custom-k8s-table">
      <el-table-column label="Service 名称" prop="name" min-width="220" show-overflow-tooltip>
        <template #default="scope">
          <span style="font-weight: bold; color: #303133;">{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="命名空间" prop="namespace" width="150" align="center" />
      
      <el-table-column label="类型 (Type)" prop="type" width="140" align="center">
        <template #default="scope">
          <el-tag :type="getServiceTypeColor(scope.row.type)" effect="dark">
            {{ scope.row.type }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="集群内部 IP (ClusterIP)" prop="clusterIp" width="160" align="center">
        <template #default="scope">
          <span style="font-family: monospace;">{{ scope.row.clusterIp }}</span>
        </template>
      </el-table-column>

      <el-table-column label="外部访问 IP (ExternalIP)" prop="externalIp" width="180" align="center">
        <template #default="scope">
           <span style="color: #909399;" v-if="scope.row.externalIp === '<none>'">{{ scope.row.externalIp }}</span>
           <span style="font-family: monospace; font-weight: bold; color: #409EFF;" v-else>{{ scope.row.externalIp }}</span>
        </template>
      </el-table-column>

      <el-table-column label="端口映射 (Ports)" prop="ports" min-width="200" show-overflow-tooltip>
        <template #default="scope">
           <span class="code-font">{{ scope.row.ports }}</span>
        </template>
      </el-table-column>

      <el-table-column label="创建时间" prop="creationTimestamp" width="180" align="center" />
      
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="120">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">
            详情监控
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup name="KubernetesService">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getNamespaces } from '@/api/monitor/kuber/common'
import { listServices } from '@/api/monitor/kuber/service'

const router = useRouter()
const loading = ref(true)
const showSearch = ref(true)
const serviceList = ref([])
const namespaceOptions = ref([])

const queryParams = ref({
  namespace: ''
})

const loadOptions = () => {
  getNamespaces().then(res => {
    namespaceOptions.value = res.data
  })
}

const getList = () => {
  loading.value = true
  listServices(queryParams.value).then(response => {
    serviceList.value = response.data
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

const handleQuery = () => { getList() }

const resetQuery = () => {
  queryParams.value.namespace = ''
  handleQuery()
}

// 为不同的 Service Type 分配颜色
const getServiceTypeColor = (type) => {
  if (type === 'NodePort') return 'warning'
  if (type === 'LoadBalancer') return 'success'
  if (type === 'ExternalName') return 'danger'
  return 'info' // ClusterIP 默认为灰色
}

const handleDetail = (row) => {
  router.push({
    path: '/monitor/kubernetes/service-detail',
    query: { namespace: row.namespace, serviceName: row.name }
  })
}

onMounted(() => {
  loadOptions()
  getList()
})
</script>

<style scoped>
:deep(.custom-k8s-table .el-table__header th) {
  background-color: #f5f7fa !important;
  color: #303133;
  font-weight: bold;
}

/* 端口信息等宽字体 */
.code-font {
  font-family: Consolas, Monaco, "Courier New", monospace;
  color: #E6A23C;
  font-size: 13px;
  background-color: #fdf6ec;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #faecd8;
}
</style>