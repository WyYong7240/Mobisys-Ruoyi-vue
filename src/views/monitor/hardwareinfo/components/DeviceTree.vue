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
        :expand-on-click-node="true"
        @node-click="onNodeClick"
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node">
            <el-icon v-if="data.physicalId" style="color: #67C23A; margin-right: 5px;">
              <Platform />
            </el-icon>
            <el-icon v-else style="color: #409EFF; margin-right: 5px;">
              <Monitor />
            </el-icon>
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

// src/views/monitor/components/DeviceTree.vue 脚本部分

const onNodeClick = (data, node) => {
  // [Debug] 查看当前点击的节点属性
  console.log('[Debug - Tree] 尝试点击节点:', data.deviceName);

  // 【核心拦截】：如果该节点没有 physicalId，说明它只是个“文件夹”或“类别”
  if (!data.physicalId) {
    console.log('[Debug - Tree] 该节点为分类目录，拦截点击传输，仅允许展开/收起');
    
    // 可选：手动切换展开/收起状态（如果你的 el-tree 没有开启 expand-on-click-node）
    node.expanded = !node.expanded;
    
    // 强制清除当前树的“选中高亮”状态，防止目录变蓝
    // deviceTreeRef.value.setCurrentKey(null); 
    return; // 直接返回，不再修改 activeDeviceId，也不会触发后续的 Watcher
  }

  // --- 只有具体的设备才能走到这里 ---
  console.log('[Debug - Tree] 确认点击具体设备:', data.physicalName);
  activeDeviceId.value = data.parentId || data.deviceId;
  currentNodeDeviceId.value = data.deviceId;
  expandParentNodes(data);
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
/* 针对设备树的样式优化 */
:deep(.el-tree-node__content) {
  /* 默认让所有节点（目录）鼠标指针为普通箭头 */
  cursor: default; 
}

/* 只有具备设备标识的节点，才显示小手（Pointer） */
:deep(.custom-tree-node:has(.el-icon[style*="color: #67C23A"])) {
  cursor: pointer;
}
</style>