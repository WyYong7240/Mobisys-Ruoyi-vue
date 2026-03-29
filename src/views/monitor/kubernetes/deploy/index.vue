<template>
  <div class="app-container">
    <el-form
      :model="queryParams"
      ref="queryRef"
      :inline="true"
      v-show="showSearch"
      label-width="88px"
    >
      <el-form-item label="命名空间" prop="namespace">
        <el-select
          v-model="queryParams.namespace"
          placeholder="请选择命名空间"
          clearable
          @change="handleQuery"
          style="width: 200px"
        >
          <el-option
            v-for="item in namespaceOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery"
          >搜索</el-button
        >
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="success" plain icon="RefreshRight" @click="getList"
          >刷新数据</el-button
        >
      </el-col>
      <right-toolbar
        v-model:showSearch="showSearch"
        @queryTable="getList"
      ></right-toolbar>
    </el-row>

    <el-table
      v-loading="loading"
      :data="deploymentList"
      border
      class="custom-k8s-table"
    >
      <el-table-column
        label="Deployment 名称"
        prop="name"
        min-width="250"
        show-overflow-tooltip
      >
        <template #default="scope">
          <span style="font-weight: bold; color: #303133">{{
            scope.row.name
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="命名空间"
        prop="namespace"
        width="160"
        align="center"
      />

      <el-table-column
        label="副本状态 (Ready/Total)"
        width="200"
        align="center"
      >
        <template #default="scope">
          <el-tag
            :type="
              scope.row.readyReplicas === scope.row.replicas
                ? 'success'
                : 'danger'
            "
            effect="light"
            size="large"
            style="font-weight: bold; font-size: 14px"
          >
            {{ scope.row.readyReplicas }} / {{ scope.row.replicas }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        label="可用副本 (Available)"
        prop="availableReplicas"
        width="160"
        align="center"
      />
      <el-table-column
        label="创建时间"
        prop="creationTimestamp"
        width="200"
        align="center"
      />

      <el-table-column
        label="操作"
        align="center"
        class-name="small-padding fixed-width"
        width="150"
      >
        <template #default="scope">
          <el-button
            link
            type="primary"
            icon="View"
            @click="handleDetail(scope.row)"
          >
            详情监控
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup name="KubernetesDeployment">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getNamespaces } from "@/api/monitor/kuber/common";
import { listDeployments } from "@/api/monitor/kuber/deploy";

const router = useRouter();
const loading = ref(true);
const showSearch = ref(true);
const deploymentList = ref([]);
const namespaceOptions = ref([]);

const queryParams = ref({
  namespace: "",
});

// 拉取命名空间供下拉框使用
const loadOptions = () => {
  getNamespaces().then((res) => {
    namespaceOptions.value = res.data;
  });
};

// 获取 Deployment 列表
const getList = () => {
  loading.value = true;
  listDeployments(queryParams.value)
    .then((response) => {
      deploymentList.value = response.data;
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });
};

const handleQuery = () => {
  getList();
};

const resetQuery = () => {
  queryParams.value.namespace = "";
  handleQuery();
};

// 跳转到 Deployment 详情页
const handleDetail = (row) => {
  router.push({
    path: "/monitor/kubernetes/deployment-detail",
    query: { namespace: row.namespace, deploymentName: row.name },
  });
};

onMounted(() => {
  loadOptions();
  getList();
});
</script>

<style scoped>
:deep(.custom-k8s-table .el-table__header th) {
  background-color: #f5f7fa !important;
  color: #303133;
  font-weight: bold;
}
</style>
