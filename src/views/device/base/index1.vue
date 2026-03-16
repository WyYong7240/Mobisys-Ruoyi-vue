<template>
  <div class="app-container">
    <el-row :gutter="20">
      <splitpanes class="default-theme">

        <!-- 左侧机房树 -->
        <pane size="18">
          <div class="head-container">
            <el-input
              v-model="roomName"
              placeholder="请输入机房名称"
              clearable
              prefix-icon="Search"
            />
          </div>

          <div class="head-container">
            <el-tree
              :data="roomOptions"
              :props="{ label: 'label', children: 'children' }"
              node-key="id"
              highlight-current
              default-expand-all
              ref="roomTreeRef"
              :filter-node-method="filterNode"
              @node-click="handleNodeClick"
            />
          </div>
        </pane>

        <!-- 右侧物理机列表 -->
        <pane size="82">
          <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
            <el-form-item label="物理机名称" prop="machineName">
              <el-input
                v-model="queryParams.machineName"
                placeholder="请输入物理机名称"
                clearable
                @keyup.enter="handleQuery"
              />
            </el-form-item>

            <el-form-item label="服务器品牌" prop="brand">
              <el-input
                v-model="queryParams.brand"
                placeholder="请输入服务器品牌"
                clearable
                @keyup.enter="handleQuery"
              />
            </el-form-item>

            <el-form-item label="服务器型号" prop="model">
              <el-input
                v-model="queryParams.model"
                placeholder="请输入服务器型号"
                clearable
                @keyup.enter="handleQuery"
              />
            </el-form-item>

            <el-form-item label="负责人" prop="adminUser">
              <el-input
                v-model="queryParams.adminUser"
                placeholder="请输入负责人"
                clearable
                @keyup.enter="handleQuery"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
              <el-button icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <!-- 操作按钮 -->
          <el-row :gutter="10" class="mb8">
            <el-col :span="1.5">
              <el-button type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
            </el-col>

            <el-col :span="1.5">
              <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate">
                修改
              </el-button>
            </el-col>

            <el-col :span="1.5">
              <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete">
                删除
              </el-button>
            </el-col>

            <el-col :span="1.5">
              <el-button type="warning" plain icon="Download" @click="handleExport">
                导出
              </el-button>
            </el-col>

            <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
          </el-row>

          <!-- 表格 -->
          <el-table v-loading="loading" :data="baseList" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />

            <el-table-column label="物理机ID" prop="machineId" />

            <el-table-column label="物理机名称" prop="machineName" />

            <el-table-column label="服务器品牌" prop="brand" />

            <el-table-column label="服务器型号" prop="model" />

            <el-table-column label="运行状态" prop="status">
              <template #default="scope">
                <el-tag type="success" v-if="scope.row.status === '运行'">运行</el-tag>
                <el-tag type="info" v-if="scope.row.status === '闲置'">闲置</el-tag>
                <el-tag type="warning" v-if="scope.row.status === '维护'">维护</el-tag>
                <el-tag type="danger" v-if="scope.row.status === '离线'">离线</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="机房ID" prop="roomId" />

            <el-table-column label="保修时间" prop="warrantyExpire" width="160">
              <template #default="scope">
                <span>{{ parseTime(scope.row.warrantyExpire, '{y}-{m}-{d}') }}</span>
              </template>
            </el-table-column>

            <el-table-column label="负责人" prop="adminUser" />

            <el-table-column label="操作">
              <template #default="scope">
                <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
                <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <pagination
            v-show="total>0"
            :total="total"
            v-model:page="queryParams.pageNum"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </pane>
      </splitpanes>
    </el-row>
  </div>
</template>

<script setup>
import { listBase, getBase, delBase, addBase, updateBase, roomTreeSelect } from "@/api/device/base"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

const { proxy } = getCurrentInstance()

const baseList = ref([])
const loading = ref(true)
const showSearch = ref(true)

const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)

const roomName = ref("")
const roomOptions = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  machineName: null,
  brand: null,
  model: null,
  adminUser: null,
  roomId: null
})

/** 查询列表 */
function getList() {
  loading.value = true
  listBase(queryParams).then(res => {
    baseList.value = res.rows
    total.value = res.total
    loading.value = false
  })
}

/** 查询机房树 */
function getRoomTree() {
  roomTreeSelect().then(res => {
    roomOptions.value = res.data
  })
}

/** 树点击 */
function handleNodeClick(data) {
  queryParams.roomId = data.id
  queryParams.pageNum = 1
  getList()
}

/** 树过滤 */
const filterNode = (value, data) => {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

watch(roomName, val => {
  proxy.$refs.roomTreeRef.filter(val)
})

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.roomId = null
  getList()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.machineId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

onMounted(() => {
  getRoomTree()
  getList()
})
</script>

<style scoped>
.head-container{
  padding:10px;
  background:#fff;
  margin-bottom:10px;
  border-radius:4px;
}
.mb8{
  margin-bottom:8px;
}
</style>