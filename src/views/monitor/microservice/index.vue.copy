<template>
  <div class="app-container">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="NAMESPACE">
          <el-select v-model="queryParams.namespace" placeholder="Select Namespace" @change="handleNamespaceChange">
            <el-option v-for="item in namespaceOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="SERVICE">
          <el-select v-model="queryParams.service" placeholder="Select Service" @change="handleServiceChange">
            <el-option v-for="item in serviceOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="POD">
          <el-select v-model="queryParams.pod" placeholder="Select Pod" @change="handleFilterChange">
            <el-option v-for="item in podOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item style="float: right;">
          <el-button icon="el-icon-refresh" circle @click="refreshData"></el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="stats-card">
      <el-row :gutter="10">
        <el-col :span="4" class="stat-item">
          <div class="stat-label">TOTAL NAMESPACES</div>
          <div class="stat-value text-blue">{{ namespaceOptions.length }}</div>
        </el-col>
        <el-col :span="4" class="stat-item">
          <div class="stat-label">CURRENT NAMESPACE</div>
          <div class="stat-value text-black">{{ queryParams.namespace || '-' }}</div>
        </el-col>

        <el-col :span="4" class="stat-item">
          <div class="stat-label">TOTAL SERVICES</div>
          <div class="stat-value text-blue">{{ serviceOptions.length }}</div>
        </el-col>
        <el-col :span="4" class="stat-item">
          <div class="stat-label">CURRENT SERVICE</div>
          <div class="stat-value text-black">{{ queryParams.service || '-' }}</div>
        </el-col>

        <el-col :span="4" class="stat-item">
          <div class="stat-label">TOTAL PODS</div>
          <div class="stat-value text-blue">{{ realPodCount }}</div>
        </el-col>
        <el-col :span="4" class="stat-item">
          <div class="stat-label">CURRENT POD</div>
          <div class="stat-value text-black" style="font-size: 13px; word-break: break-all;">
            {{ queryParams.pod || '-' }}
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="15">
      <el-col :span="12" v-for="panel in panelList" :key="panel.id" style="margin-bottom: 15px;">
        <el-card shadow="hover" body-style="padding: 0px; height: 320px; overflow: hidden;">
          <!-- <div slot="header" style="padding: 8px 15px; font-size: 13px; font-weight: bold; background: #f9f9f9;">
            {{ panel.name }}
          </div> -->
          <iframe
            :src="getGrafanaUrl(panel.id)"
            width="100%"
            height="330"
            frameborder="0"
            scrolling="no"
            style="margin-top: -10px;">
          </iframe>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "MicroServiceMonitor",
  data() {
    return {
      queryParams: {
        namespace: 'tt',
        service: 'mysql',
        pod: 'tsdb-mysql-2'
      },
      namespaceOptions: [],
      serviceOptions: [],
      podOptions: [],
      grafanaBaseUrl: "http://192.168.31.34:32556/d-solo/aa347ca0-0f9d-4716-a151-9494379e4405/microservice-pod",
      panelList: [
        { id: 1, name: "CPU Usage" },
        { id: 2, name: "Memory Usage" },
        { id: 5, name: "Network Receive" },
        { id: 4, name: "Network Transmit" },
        { id: 3, name: "Disk I/O" }
      ]
    };
  },
  computed: {
    // 计算属性：排除 'All' 之后的真实 Pod 数量
    realPodCount() {
      const count = this.podOptions.filter(item => item !== 'All').length;
      return count > 0 ? count : 0;
    }
  },
  created() {
    this.fetchNamespaces();
  },
  methods: {
    async fetchNamespaces() {
      try {
        const res = await axios.get('/api/datasources/proxy/1/api/v1/label/namespace/values');
        if (res.data.status === 'success') {
          this.namespaceOptions = res.data.data;
          if (!this.namespaceOptions.includes(this.queryParams.namespace)) {
            this.queryParams.namespace = this.namespaceOptions[0];
          }
          this.fetchServices();
        }
      } catch (e) { this.$message.error('Namespace API Error'); }
    },

    async fetchServices() {
      try {
        const ns = this.queryParams.namespace;
        const url = `/api/datasources/proxy/1/api/v1/label/container/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container!="",container!="POD"}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') {
          this.serviceOptions = res.data.data;
          if (this.serviceOptions.length > 0 && !this.serviceOptions.includes(this.queryParams.service)) {
            this.queryParams.service = this.serviceOptions[0];
          }
          this.fetchPods();
        }
      } catch (e) {
        console.error(e);
      }
    },

    async fetchPods() {
      try {
        const ns = this.queryParams.namespace;
        const svc = this.queryParams.service;
        const url = `/api/datasources/proxy/1/api/v1/label/pod/values?match[]=container_memory_working_set_bytes{namespace="${ns}",container="${svc}"}`;
        const res = await axios.get(url);
        if (res.data.status === 'success') {
          this.podOptions = ['All', ...res.data.data];
          if (!this.podOptions.includes(this.queryParams.pod)) {
            this.queryParams.pod = 'All';
          }
        }
      } catch (e) {
        console.error(e);
      }
    },

    getGrafanaUrl(panelId) {
      const params = new URLSearchParams({
        orgId: 1,
        theme: 'light',
        panelId: panelId,
        'var-namespace': this.queryParams.namespace,
        'var-service': this.queryParams.service,
        'var-Pod': this.queryParams.pod // 必须大写 P 对应 Grafana 变量
      });
      return `${this.grafanaBaseUrl}?${params.toString()}`;
    },

    handleNamespaceChange() {
      this.fetchServices();
    },
    handleServiceChange() {
      this.fetchPods();
    },
    handleFilterChange() {
      this.$forceUpdate();
    },
    refreshData() {
      this.fetchNamespaces();
      this.$message.success('数据已更新');
    }
  }
};
</script>

<style scoped>
.filter-card {
  margin-bottom: 10px;
  background-color: #fcfcfc;
}

.stats-card {
  margin-bottom: 15px;
  border-top: 3px solid #1890ff;
}

/* 统计项样式优化 */
.stat-item {
  text-align: center;
  border-right: 1px solid #f0f0f0;
  min-height: 50px;
}

.stat-item:last-child {
  border-right: none;
}

.stat-label {
  font-size: 11px;
  color: #999;
  font-weight: bold;
  margin-bottom: 5px;
  white-space: nowrap;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
}

.text-blue {
  color: #1890ff;
}

.text-black {
  color: #303133;
}

.text-green {
  color: #67C23A;
}
</style>

