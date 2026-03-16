<template>
  <div class="sidebar-wrapper">
    <div class="sidebar-header">
      <el-icon><Monitor /></el-icon>
      <span>设备列表</span>
    </div>
    
    <div class="tree-search-box">
      <el-input v-model="treeSearch" placeholder="搜索设备..." clearable :prefix-icon="Search" />
    </div>

    <div class="tree-content">
      <el-tree
        :data="deviceTree"
        :props="treeProps"
        :filter-node-method="filterNode"
        node-key="deviceId"
        ref="deviceTreeRef"
        highlight-current
        default-expand-all
        @node-click="onNodeClick"
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node">
            <el-icon v-if="data.deviceType === '物理机' || (!data.children || data.children.length === 0)" style="color: #67C23A; margin-right: 5px;"><Platform /></el-icon>
            <el-icon v-else style="color: #409EFF; margin-right: 5px;"><Monitor /></el-icon>
            <span>{{ node.label }}</span>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup>
import { Monitor, Platform, Search } from '@element-plus/icons-vue'
import { watch } from 'vue'
import { 
  treeSearch, deviceTree, deviceTreeRef, treeProps, 
  activeDeviceId, currentNodeDeviceId, expandParentNodes 
} from '@/api/monitor/deviceMonitor'

const filterNode = (value, data) => {
  if (!value) return true
  return data.deviceName.indexOf(value) !== -1
}

watch(treeSearch, (val) => {
  deviceTreeRef.value?.filter(val)
})

const onNodeClick = (data) => {
  if (data && data.deviceId) {
    console.log('[Debug - Tree] 节点被点击:', data.deviceName || data.physicalName)
    activeDeviceId.value = data.parentId || data.deviceId
    currentNodeDeviceId.value = data.deviceId
    expandParentNodes(data)
    // 此时不再在这里直接调用 loadData，而是靠右侧组件里的 Watcher 自行驱动数据加载
  }
}
</script>

<style scoped lang="scss">
.sidebar-wrapper {
  background: #fff;
  height: 100%;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  
  .sidebar-header {
    padding: 16px 20px;
    font-weight: bold;
    font-size: 16px;
    color: #2c3e50;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0; 
  }
  .tree-search-box { padding: 12px 15px; border-bottom: 1px solid #ebeef5; flex-shrink: 0; }
  .tree-content { flex: 1; overflow-y: auto; padding: 8px 10px; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 4px; } }
}
:deep(.el-tree) {
  background: transparent;
  .el-tree-node__content { height: 36px; border-radius: 4px; margin-bottom: 2px; font-size: 14px; &:hover { background-color: #f5f7fa; } }
  .el-tree-node.is-current > .el-tree-node__content { background-color: #eef5fe; color: #409eff; font-weight: bold; border-right: 3px solid #409eff; }
}
.custom-tree-node { display: flex; align-items: center; width: 100%; }
</style>