<template>
  <div class="app-container">
    <el-page-header
      @back="goBack"
      :content="`Deployment 详情: ${deploymentName}`"
      style="margin-bottom: 20px"
    />

    <el-card shadow="hover" style="margin-bottom: 20px">
      <template #header>
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <span style="font-weight: bold; font-size: 16px">
            <el-icon
              style="margin-right: 5px; vertical-align: middle; color: #67c23a"
              ><Document
            /></el-icon>
            负载配置与状态 (Configuration & Status)
          </span>
          <el-button type="success" plain icon="Download" @click="downloadYaml">
            下载 YAML 配置文件
          </el-button>
        </div>
      </template>

      <el-descriptions :column="3" border size="default" v-loading="loading">
        <el-descriptions-item
          label="Deployment 名称"
          label-class-name="desc-label"
          class-name="desc-content"
          >{{ deployInfo.metadata?.name }}</el-descriptions-item
        >
        <el-descriptions-item
          label="命名空间"
          label-class-name="desc-label"
          class-name="desc-content"
          >{{ deployInfo.metadata?.namespace }}</el-descriptions-item
        >
        <el-descriptions-item
          label="创建时间"
          label-class-name="desc-label"
          class-name="desc-content"
          >{{ deployInfo.metadata?.creationTimestamp }}</el-descriptions-item
        >

        <el-descriptions-item
          label="期望副本数"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          <span style="font-weight: bold; font-size: 16px">{{
            deployInfo.spec?.replicas
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          label="就绪副本数"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          <span style="font-weight: bold; font-size: 16px; color: #67c23a">{{
            deployInfo.status?.readyReplicas || 0
          }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          label="副本状态"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          <el-tag
            :type="
              deployInfo.status?.readyReplicas === deployInfo.spec?.replicas
                ? 'success'
                : 'danger'
            "
            effect="dark"
          >
            {{
              deployInfo.status?.readyReplicas === deployInfo.spec?.replicas
                ? "Running"
                : "Updating"
            }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item
          label="更新策略"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          <el-tag type="info" effect="plain">{{
            deployInfo.spec?.strategy?.type
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item
          label="最大增量 (MaxSurge)"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          {{ deployInfo.spec?.strategy?.rollingUpdate?.maxSurge || "-" }}
        </el-descriptions-item>
        <el-descriptions-item
          label="最大不可用"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          {{ deployInfo.spec?.strategy?.rollingUpdate?.maxUnavailable || "-" }}
        </el-descriptions-item>

        <el-descriptions-item
          label="选择器 (Selectors)"
          :span="3"
          label-class-name="desc-label"
          class-name="desc-content"
        >
          <template v-if="deployInfo.spec?.selector?.matchLabels">
            <el-tag
              v-for="(val, key) in deployInfo.spec.selector.matchLabels"
              :key="key"
              size="default"
              type="info"
              effect="plain"
              class="k8s-label-tag"
            >
              <span class="label-key">{{ key }}</span> : {{ val }}
            </el-tag>
          </template>
        </el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 25px">
        <h4 style="margin-bottom: 15px; color: #303133; font-size: 16px">
          <el-icon
            style="vertical-align: middle; margin-right: 5px; color: #409eff"
            ><Box
          /></el-icon>
          Pod 模板容器 (Pod Template Containers)
        </h4>
        <el-table
          :data="deployInfo.spec?.template?.spec?.containers"
          border
          v-loading="loading"
          class="custom-k8s-table"
        >
          <el-table-column label="容器名称" prop="name" width="180">
            <template #default="scope">
              <span style="font-weight: bold; color: #303133">{{
                scope.row.name
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="容器镜像"
            prop="image"
            min-width="280"
            show-overflow-tooltip
          >
            <template #default="scope">
              <span class="code-font">{{ scope.row.image }}</span>
            </template>
          </el-table-column>
          <el-table-column label="端口" width="180">
            <template #default="scope">
              <div v-for="port in scope.row.ports" :key="port.containerPort">
                <el-tag size="small" type="warning" effect="light">
                  <span
                    v-if="port.name"
                    style="color: #e6a23c; margin-right: 4px"
                    >{{ port.name }}</span
                  >
                  <span style="font-weight: bold"
                    >{{ port.containerPort }}/{{ port.protocol }}</span
                  >
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin-top: 20px">
        <el-collapse>
          <el-collapse-item name="1">
            <template #title>
              <span style="font-weight: bold; font-size: 14px; color: #606266">
                <el-icon style="margin-right: 5px"><Warning /></el-icon>
                负载事件追踪 (Events)
              </span>
            </template>
            <el-timeline
              v-if="eventsData.length > 0"
              style="padding-top: 10px; padding-left: 10px"
            >
              <el-timeline-item
                v-for="(activity, index) in eventsData"
                :key="index"
                :type="activity.includes('[Normal]') ? 'success' : 'danger'"
              >
                {{ activity }}
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无负载事件" :image-size="60" />
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <span style="font-weight: bold; font-size: 16px">
          <el-icon
            style="margin-right: 5px; vertical-align: middle; color: #409eff"
            ><DataLine
          /></el-icon>
          负载实时性能 (Grafana) - 需配置 var-deployment 变量
        </span>
      </template>
      <div class="grafana-section">
        <el-row :gutter="15">
          <el-col
            :span="12"
            v-for="panel in deployPanelList"
            :key="panel.id"
            style="margin-bottom: 20px"
          >
            <div class="iframe-container">
              <div class="iframe-header">
                {{ panel.name }}
                <el-tooltip :content="panel.desc" placement="top">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <iframe
                :src="
                  getDeploymentGrafanaUrl(panel.id, deploymentName, namespace)
                "
                width="100%"
                height="280"
                frameborder="0"
                scrolling="no"
              >
              </iframe>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getDeploymentDetail,
  getDeploymentGrafanaUrl,
  deployPanelList,
} from "@/api/monitor/kuber/deploy";
import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const namespace = ref(route.query.namespace || "");
const deploymentName = ref(route.query.deploymentName || "");

// 数据模型
const deployInfo = ref({});
const yamlData = ref("");
const eventsData = ref([]);

const goBack = () => {
  router.go(-1);
};

const loadDetail = () => {
  if (!namespace.value || !deploymentName.value) return;
  loading.value = true;
  getDeploymentDetail(namespace.value, deploymentName.value)
    .then((res) => {
      deployInfo.value = res.data.deployment || {};
      yamlData.value = res.data.yaml;
      eventsData.value = res.data.events;
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });
};

// 纯前端下载 YAML
const downloadYaml = () => {
  if (!yamlData.value) {
    ElMessage.warning("YAML 数据尚未加载");
    return;
  }
  const blob = new Blob([yamlData.value], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${deploymentName.value}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  ElMessage.success(`已开始下载 ${deploymentName.value}.yaml`);
};

onMounted(() => {
  loadDetail();
});
</script>

<style scoped>
:deep(.desc-label) {
  background-color: #f0f4f8 !important;
  color: #303133 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  width: 140px; /* 稍微调宽一点 */
}

:deep(.desc-content) {
  color: #1f2d3d !important;
  font-size: 14px !important;
  font-weight: 500;
}

:deep(.custom-k8s-table .el-table__header th) {
  background-color: #f5f7fa !important;
  color: #303133;
  font-weight: bold;
}

.code-font {
  font-family: Consolas, Monaco, "Courier New", monospace;
  color: #475669;
  font-size: 13px;
  background-color: #f9fafc;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.k8s-label-tag {
  margin-right: 8px;
  margin-bottom: 4px;
  border-color: #dcdfe6;
  color: #606266;
}
.label-key {
  font-weight: bold;
  color: #303133;
}

/* Grafana 样式 */
.grafana-section {
  padding-top: 10px;
}
.iframe-container {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fff;
  transition: all 0.3s;
  overflow: hidden;
}
.iframe-container:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.iframe-header {
  height: 40px;
  line-height: 40px;
  padding: 0 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-icon {
  color: #909399;
  cursor: pointer;
  font-size: 16px;
}
.info-icon:hover {
  color: #409eff;
}
</style>
