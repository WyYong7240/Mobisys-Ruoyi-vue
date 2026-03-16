<template>
  <div class="app-container">
    <el-row :gutter="20">
      <splitpanes :horizontal="appStore.device === 'mobile'" class="default-theme">
        <!-- 机房数据（替代部门树） -->
        <pane size="16">
          <el-col>
            <div class="head-container">
              <el-input v-model="roomName" placeholder="请输入机房名称" clearable prefix-icon="Search" style="margin-bottom: 20px" />
            </div>
            <div class="head-container">
              <el-tree 
                :data="roomOptions" 
                :props="{ label: 'label', children: 'children' }" 
                :expand-on-click-node="false" 
                :filter-node-method="filterNode" 
                ref="roomTreeRef" 
                node-key="id" 
                highlight-current 
                default-expand-all 
                @node-click="handleNodeClick" 
              />
            </div>
          </el-col>
        </pane>
        
        <!-- 物理机数据 -->
        <pane size="84">
          <el-col>
            <el-form :model="queryParams" ref="queryRef" size="small" :inline="true" v-show="showSearch" label-width="68px">
              <el-form-item label="物理机自定义名称" prop="machineName">
                <el-input
                  v-model="queryParams.machineName"
                  placeholder="请输入物理机自定义名称"
                  clearable
                  @keyup.enter.native="handleQuery"
                />
              </el-form-item>
              <el-form-item label="物理机类型" prop="machineType">
                <el-select v-model="queryParams.machineType" placeholder="请选择物理机类型" clearable>
                  <el-option label="塔式" :value="1" />
                  <el-option label="机架式" :value="2" />
                  <el-option label="刀片式" :value="3" />
                </el-select>
              </el-form-item>
              <el-form-item label="服务器品牌" prop="brand">
                <el-input
                  v-model="queryParams.brand"
                  placeholder="请输入服务器品牌"
                  clearable
                  @keyup.enter.native="handleQuery"
                />
              </el-form-item>
              <el-form-item label="服务器具体型号" prop="model">
                <el-input
                  v-model="queryParams.model"
                  placeholder="请输入服务器具体型号"
                  clearable
                  @keyup.enter.native="handleQuery"
                />
              </el-form-item>
              <el-form-item label="所属机房ID" prop="roomId">
                <el-input
                  v-model="queryParams.roomId"
                  placeholder="请输入所属机房ID"
                  clearable
                  @keyup.enter.native="handleQuery"
                />
              </el-form-item>
              <el-form-item label="采购入库时间" prop="purchaseTime">
                <el-date-picker clearable
                  v-model="queryParams.purchaseTime"
                  type="date"
                  value-format="yyyy-MM-dd"
                  placeholder="请选择采购入库时间">
                </el-date-picker>
              </el-form-item>
              <el-form-item label="保修到期时间" prop="warrantyExpire">
                <el-date-picker clearable
                  v-model="queryParams.warrantyExpire"
                  type="date"
                  value-format="yyyy-MM-dd"
                  placeholder="请选择保修到期时间">
                </el-date-picker>
              </el-form-item>
              <el-form-item label="所属运维负责人" prop="adminUser">
                <el-input
                  v-model="queryParams.adminUser"
                  placeholder="请输入所属运维负责人"
                  clearable
                  @keyup.enter.native="handleQuery"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
                <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
              </el-form-item>
            </el-form>

            <el-row :gutter="10" class="mb8">
              <el-col :span="1.5">
                <el-button
                  type="primary"
                  plain
                  icon="el-icon-plus"
                  size="mini"
                  @click="handleAdd"
                  v-hasPermi="['system:base:add']"
                >新增</el-button>
              </el-col>
              <el-col :span="1.5">
                <el-button
                  type="success"
                  plain
                  icon="el-icon-edit"
                  size="mini"
                  :disabled="single"
                  @click="handleUpdate"
                  v-hasPermi="['system:base:edit']"
                >修改</el-button>
              </el-col>
              <el-col :span="1.5">
                <el-button
                  type="danger"
                  plain
                  icon="el-icon-delete"
                  size="mini"
                  :disabled="multiple"
                  @click="handleDelete"
                  v-hasPermi="['system:base:remove']"
                >删除</el-button>
              </el-col>
              <el-col :span="1.5">
                <el-button
                  type="warning"
                  plain
                  icon="el-icon-download"
                  size="mini"
                  @click="handleExport"
                  v-hasPermi="['system:base:export']"
                >导出</el-button>
              </el-col>
              <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
            </el-row>

            <el-table v-loading="loading" :data="baseList" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="55" align="center" />
              <el-table-column label="物理机全局唯一标识" align="center" prop="machineId" />
              <el-table-column label="物理机自定义名称" align="center" prop="machineName" />
              <el-table-column label="物理机类型：1=塔式、2=机架式、3=刀片式" align="center" prop="machineType">
                <template #default="scope">
                  <el-tag v-if="scope.row.machineType == 1">塔式</el-tag>
                  <el-tag v-else-if="scope.row.machineType == 2">机架式</el-tag>
                  <el-tag v-else-if="scope.row.machineType == 3">刀片式</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="服务器品牌" align="center" prop="brand" />
              <el-table-column label="服务器具体型号" align="center" prop="model" />
              <el-table-column label="物理机当前运行状态" align="center" prop="status">
                <template #default="scope">
                  <el-tag type="success" v-if="scope.row.status === '运行'">运行</el-tag>
                  <el-tag type="info" v-else-if="scope.row.status === '闲置'">闲置</el-tag>
                  <el-tag type="warning" v-else-if="scope.row.status === '维护'">维护</el-tag>
                  <el-tag type="danger" v-else-if="scope.row.status === '离线'">离线</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="所属机房ID" align="center" prop="roomId" />
              <el-table-column label="采购入库时间" align="center" prop="purchaseTime" width="180">
                <template #default="scope">
                  <span>{{ parseTime(scope.row.purchaseTime, '{y}-{m}-{d}') }}</span>
                </template>
              </el-table-column>
              <el-table-column label="保修到期时间" align="center" prop="warrantyExpire" width="180">
                <template #default="scope">
                  <span :class="new Date(scope.row.warrantyExpire) < new Date() ? 'text-danger' : ''">
                    {{ parseTime(scope.row.warrantyExpire, '{y}-{m}-{d}') }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="所属运维负责人" align="center" prop="adminUser" />
              <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
                <template #default="scope">
                  <el-button
                    size="mini"
                    type="text"
                    icon="el-icon-edit"
                    @click="handleUpdate(scope.row)"
                    v-hasPermi="['system:base:edit']"
                  >修改</el-button>
                  <el-button
                    size="mini"
                    type="text"
                    icon="el-icon-delete"
                    @click="handleDelete(scope.row)"
                    v-hasPermi="['system:base:remove']"
                  >删除</el-button>
                  <el-button
                    size="mini"
                    type="text"
                    icon="el-icon-refresh"
                    @click="handleStatusChange(scope.row)"
                    v-hasPermi="['system:base:edit']"
                  >变更状态</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <pagination
              v-show="total>0"
              :total="total"
              :page.sync="queryParams.pageNum"
              :limit.sync="queryParams.pageSize"
              @pagination="getList"
            />
          </el-col>
        </pane>
      </splitpanes>
    </el-row>

    <!-- 添加或修改物理机基础信息对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="物理机自定义名称" prop="machineName">
          <el-input v-model="form.machineName" placeholder="请输入物理机自定义名称" />
        </el-form-item>
        <el-form-item label="服务器品牌" prop="brand">
          <el-input v-model="form.brand" placeholder="请输入服务器品牌" />
        </el-form-item>
        <el-form-item label="服务器具体型号" prop="model">
          <el-input v-model="form.model" placeholder="请输入服务器具体型号" />
        </el-form-item>
        <el-form-item label="所属机房ID" prop="roomId">
          <el-tree-select 
            v-model="form.roomId" 
            :data="roomOptions" 
            :props="{ value: 'id', label: 'label', children: 'children' }" 
            value-key="id" 
            placeholder="请选择所属机房" 
            clearable 
            check-strictly 
          />
        </el-form-item>
        <el-form-item label="采购入库时间" prop="purchaseTime">
          <el-date-picker clearable
            v-model="form.purchaseTime"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="请选择采购入库时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="保修到期时间" prop="warrantyExpire">
          <el-date-picker clearable
            v-model="form.warrantyExpire"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="请选择保修到期时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="所属运维负责人" prop="adminUser">
          <el-input v-model="form.adminUser" placeholder="请输入所属运维负责人" />
        </el-form-item>
        <el-form-item label="物理机类型" prop="machineType">
          <el-select v-model="form.machineType" placeholder="请选择物理机类型">
            <el-option label="塔式" :value="1" />
            <el-option label="机架式" :value="2" />
            <el-option label="刀片式" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="运行状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择运行状态">
            <el-option label="运行" value="运行" />
            <el-option label="闲置" value="闲置" />
            <el-option label="维护" value="维护" />
            <el-option label="离线" value="离线" />
          </el-select>
        </el-form-item>
        <el-form-item label="物理机ID" prop="machineId">
          <el-input 
            v-model="form.machineId" 
            placeholder="建议用SN号+类型缩写，如：DELL-T-001" 
            maxlength="100" 
            :disabled="form.machineId !== undefined"
          />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="Base">
import { getToken } from "@/utils/auth"
import useAppStore from '@/store/modules/app'
import { listBase, getBase, delBase, addBase, updateBase, roomTreeSelect, changeMachineStatus } from "@/api/device/base"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

const router = useRouter()
const appStore = useAppStore()
const { proxy } = getCurrentInstance()

// 响应式数据定义
const baseList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const roomName = ref("")
const roomOptions = ref(undefined)

// 查询参数
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  machineName: null,
  machineType: null,
  brand: null,
  model: null,
  status: null,
  roomId: null,
  purchaseTime: null,
  warrantyExpire: null,
  adminUser: null,
})

// 表单数据
const form = reactive({
  machineId: undefined,
  machineName: undefined,
  machineType: undefined,
  brand: undefined,
  model: undefined,
  status: '闲置',
  roomId: undefined,
  purchaseTime: undefined,
  warrantyExpire: undefined,
  adminUser: undefined
})

// 表单校验规则
const rules = reactive({
  machineName: [
    { required: true, message: "物理机自定义名称不能为空", trigger: "blur" }
  ],
  machineType: [
    { required: true, message: "物理机类型不能为空", trigger: "change" }
  ],
  brand: [
    { required: true, message: "服务器品牌不能为空", trigger: "blur" }
  ],
  model: [
    { required: true, message: "服务器具体型号不能为空", trigger: "blur" }
  ],
  status: [
    { required: true, message: "物理机当前运行状态不能为空", trigger: "change" }
  ],
  roomId: [
    { required: true, message: "所属机房ID不能为空", trigger: "blur" }
  ],
  purchaseTime: [
    { required: true, message: "采购入库时间不能为空", trigger: "blur" }
  ],
  warrantyExpire: [
    { required: true, message: "保修到期时间不能为空", trigger: "blur" }
  ],
  adminUser: [
    { required: true, message: "所属运维负责人不能为空", trigger: "blur" }
  ],
  machineId: [
    { required: true, message: "物理机ID不能为空", trigger: "blur" },
    { max: 100, message: "物理机ID长度不能超过100个字符", trigger: "blur" }
  ]
})

/** 过滤机房树节点 */
const filterNode = (value, data) => {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

/** 监听机房名称筛选 */
watch(roomName, val => {
  proxy.$refs["roomTreeRef"].filter(val)
})

/** 查询物理机基础信息列表 */
function getList() {
  loading.value = true
  listBase(queryParams).then(response => {
    baseList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 查询机房下拉树结构 */
function getRoomTree() {
  roomTreeSelect().then(response => {
    const allData = response.data;
    // 查找名为“物理机设备”的节点
    const physicalMachineNode = findNode(allData, '物理机设备');

    if (physicalMachineNode) {
      // 如果找到了，确保其子节点只有一级
      if (physicalMachineNode.children && physicalMachineNode.children.length > 0) {
        physicalMachineNode.children.forEach(child => {
          // 移除孙子节点
          child.children = null;
        });
      }
      // 只显示以“物理机设备”为根的两级树
      roomOptions.value = [physicalMachineNode];
    } else {
      // 如果没找到，显示完整的树作为备用
      roomOptions.value = allData;
    }
  });
}

/** 递归查找节点 */
function findNode(nodes, nodeLabel) {
  for (const node of nodes) {
    if (node.label === nodeLabel) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNode(node.children, nodeLabel);
      if (found) {
        return found;
      }
    }
  }
  return null;
}


/** 机房节点单击事件 */
function handleNodeClick(data) {
  // 判断是否是根节点 "物理机设备"
  if (data.label === '物理机设备') {
    // 如果是根节点，重置查询参数以显示所有
    resetQuery();
  } else if (data.machineType) {
    // 如果是子节点且有 machineType，则按类型筛选
    queryParams.machineType = data.machineType;
    queryParams.roomId = null; // 清空机房ID筛选
    handleQuery();
  } else {
    // 其他情况（例如，如果树结构不符合预期），按机房ID筛选
    queryParams.roomId = data.id;
    queryParams.machineType = null; // 清空类型筛选
    handleQuery();
  }
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  Object.assign(queryParams, {
    pageNum: 1,
    pageSize: 10,
    machineName: null,
    machineType: null,
    brand: null,
    model: null,
    status: null,
    roomId: null,
    purchaseTime: null,
    warrantyExpire: null,
    adminUser: null,
  })
  proxy.$refs.roomTreeRef.setCurrentKey(null)
  handleQuery()
}

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.machineId)
  single.value = selection.length!==1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  resetForm()
  open.value = true
  title.value = "添加物理机基础信息"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  resetForm()
  const machineId = row.machineId || ids.value
  getBase(machineId).then(response => {
    Object.assign(form, response.data)
    open.value = true
    title.value = "修改物理机基础信息"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["form"].validate(valid => {
    if (valid) {
      if (form.machineId != null) {
        updateBase(form).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addBase(form).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const machineIds = row.machineId || ids.value
  proxy.$modal.confirm('是否确认删除物理机基础信息编号为"' + machineIds + '"的数据项？').then(function() {
    return delBase(machineIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('system/base/export', {
    ...queryParams
  }, `base_${new Date().getTime()}.xlsx`)
}

/** 物理机状态修改 */
function handleStatusChange(row) {
  proxy.$modal.confirm('请选择要变更的状态').then(() => {
    proxy.$modal.select({
      title: '状态变更',
      options: [
        { label: '运行', value: '运行' },
        { label: '闲置', value: '闲置' },
        { label: '维护', value: '维护' },
        { label: '离线', value: '离线' }
      ],
      value: row.status
    }).then(({ value }) => {
      changeMachineStatus(row.machineId, value).then(() => {
        row.status = value
        proxy.$modal.msgSuccess("状态变更成功")
        getList()
      })
    })
  }).catch(() => {})
}

// 取消按钮
function cancel() {
  open.value = false
  resetForm()
}

// 表单重置
function resetForm() {
  Object.assign(form, {
    machineId: undefined,
    machineName: undefined,
    machineType: undefined,
    brand: undefined,
    model: undefined,
    status: '闲置',
    roomId: undefined,
    purchaseTime: undefined,
    warrantyExpire: undefined,
    adminUser: undefined
  })
  proxy.resetForm("form")
}

// 页面挂载时初始化
onMounted(() => {
  getRoomTree()
  getList()
})
</script>

<style scoped>
.text-danger {
  color: #f56c6c !important;
}
.head-container {
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 10px;
}
.mb8 {
  margin-bottom: 8px;
}
.dialog-footer {
  text-align: center;
}
</style>