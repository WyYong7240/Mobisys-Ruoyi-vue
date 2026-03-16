<template>
  <div class="app-container dashboard-container">
    <el-row :gutter="20" class="full-height-row">
      <splitpanes :horizontal="appStore.device === 'mobile'" class="default-theme full-height-splitpanes">
        
        <pane size="16">
          <DeviceTree />
        </pane>

        <pane size="84">
          <div class="scrollable-pane">
            <HardwareMonitor />
            <OsMonitor />
          </div>
        </pane>
        
      </splitpanes>
    </el-row>
  </div>
</template>

<script setup name="DeviceMonitor">
import { onMounted, getCurrentInstance } from 'vue'
import useAppStore from '@/store/modules/app'
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

import DeviceTree from './components/DeviceTree.vue'
import HardwareMonitor from './components/HardwareMonitor.vue'
import OsMonitor from './components/OsMonitor.vue'

import { getDeviceTree, selectNodeByPhysicalId } from '@/api/monitor/deviceMonitor'

const appStore = useAppStore()
const { proxy } = getCurrentInstance()

onMounted(() => {
  getDeviceTree()
  const routeQuery = proxy.$route.query
  if (routeQuery.physicalId) {
    console.log('[Debug - Index] 收到路由 physicalId 参数:', routeQuery.physicalId)
    setTimeout(() => { 
      selectNodeByPhysicalId(parseInt(routeQuery.physicalId), proxy) 
    }, 800)
  }
})
</script>

<style scoped lang="scss">
.dashboard-container {
  background-color: #f2f4f7;
  height: calc(100vh - 84px);
  overflow: hidden; 
}
.full-height-row, .full-height-splitpanes { height: 100%; }
:deep(.splitpanes__pane) { overflow: hidden; }

/* 右侧独立滚动区统一样式 */
.scrollable-pane {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 20px;
  box-sizing: border-box;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 4px; }
}
</style>