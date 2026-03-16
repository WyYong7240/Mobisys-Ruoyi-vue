<template>
    <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
        <el-form-item label="物理机名称" prop="roomName">
          <el-input
            v-model="queryParams.roomName"
            placeholder="请输入物理机名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
  
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['device:room:add']"
          >新增</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            type="info"
            plain
            icon="Sort"
            @click="toggleExpandAll"
          >展开/折叠</el-button>
        </el-col>
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>
  
      <el-table
        v-if="refreshTable"
        v-loading="loading"
        :data="roomList"
        row-key="roomId"
        :default-expand-all="isExpandAll"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
      >
        <el-table-column label="物理机名称" align="center" prop="roomName" />
        <el-table-column label="负责人" align="center" prop="leader" />
        <el-table-column label="联系电话" align="center" prop="phone" />
        <el-table-column label="邮箱" align="center" prop="email" />
        <el-table-column label="机房状态" align="center" prop="status">
          <template #default="scope">
            <dict-tag :options="sys_job_status" :value="scope.row.status"/>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="180">
          <template #default="scope">
            <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['device:room:edit']">修改</el-button>
            <el-button link type="primary" icon="Plus" @click="handleAdd(scope.row)" v-hasPermi="['device:room:add']">新增</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['device:room:remove']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
  
      <!-- 添加或修改设备管理对话框 -->
      <el-dialog :title="title" v-model="open" width="500px" append-to-body>
        <el-form ref="roomRef" :model="form" :rules="rules" label-width="80px">
          <el-form-item label="父物理机ID" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              :data="roomOptions"
              :props="{ value: 'roomId', label: 'roomName', children: 'children' }"
              value-key="roomId"
              placeholder="请选择父物理机ID"
              check-strictly
            />
          </el-form-item>
          <el-form-item label="物理机名称" prop="roomName">
            <el-input v-model="form.roomName" placeholder="请输入物理机名称" />
          </el-form-item>
          <el-form-item label="显示顺序" prop="orderNum">
            <el-input v-model="form.orderNum" placeholder="请输入显示顺序" />
          </el-form-item>
          <el-form-item label="负责人" prop="leader">
            <el-input v-model="form.leader" placeholder="请输入负责人" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="机房状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择机房状态">
              <el-option
                v-for="dict in sys_job_status"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="删除标志" prop="delFlag">
            <el-input v-model="form.delFlag" placeholder="请输入删除标志" />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup name="Room">
  import { listRoom, getRoom, delRoom, addRoom, updateRoom } from "@/api/device/room"
  
  const { proxy } = getCurrentInstance()
  const { sys_job_status } = proxy.useDict('sys_job_status')
  
  const roomList = ref([])
  const roomOptions = ref([])
  const open = ref(false)
  const loading = ref(true)
  const showSearch = ref(true)
  const title = ref("")
  const isExpandAll = ref(true)
  const refreshTable = ref(true)
  
  const data = reactive({
    form: {},
    queryParams: {
      roomName: null,
    },
    rules: {
    }
  })
  
  const { queryParams, form, rules } = toRefs(data)
  
  /** 查询设备管理列表 */
  function getList() {
    loading.value = true
    listRoom(queryParams.value).then(response => {
      roomList.value = proxy.handleTree(response.data, "roomId", "parentId")
      loading.value = false
    })
  }
  
  /** 查询设备管理下拉树结构 */
  function getTreeselect() {
    listRoom().then(response => {
      roomOptions.value = []
      const data = { roomId: 0, roomName: '顶级节点', children: [] }
      data.children = proxy.handleTree(response.data, "roomId", "parentId")
      roomOptions.value.push(data)
    })
  }
      
  // 取消按钮
  function cancel() {
    open.value = false
    reset()
  }
  
  // 表单重置
  function reset() {
    form.value = {
      roomId: null,
      parentId: null,
      ancestors: null,
      roomName: null,
      orderNum: null,
      leader: null,
      phone: null,
      email: null,
      status: null,
      delFlag: null,
      createBy: null,
      createTime: null,
      updateBy: null,
      updateTime: null,
      remark: null
    }
    proxy.resetForm("roomRef")
  }
  
  /** 搜索按钮操作 */
  function handleQuery() {
    getList()
  }
  
  /** 重置按钮操作 */
  function resetQuery() {
    proxy.resetForm("queryRef")
    handleQuery()
  }
  
  /** 新增按钮操作 */
  function handleAdd(row) {
    reset()
    getTreeselect()
    if (row != null && row.roomId) {
      form.value.parentId = row.roomId
    } else {
      form.value.parentId = 0
    }
    open.value = true
    title.value = "添加设备管理"
  }
  
  /** 展开/折叠操作 */
  function toggleExpandAll() {
    refreshTable.value = false
    isExpandAll.value = !isExpandAll.value
    nextTick(() => {
      refreshTable.value = true
    })
  }
  
  /** 修改按钮操作 */
  async function handleUpdate(row) {
    reset()
    await getTreeselect()
    if (row != null) {
      form.value.parentId = row.parentId
    }
    getRoom(row.roomId).then(response => {
      form.value = response.data
      open.value = true
      title.value = "修改设备管理"
    })
  }
  
  /** 提交按钮 */
  function submitForm() {
    proxy.$refs["roomRef"].validate(valid => {
      if (valid) {
        if (form.value.roomId != null) {
          updateRoom(form.value).then(response => {
            proxy.$modal.msgSuccess("修改成功")
            open.value = false
            getList()
          })
        } else {
          addRoom(form.value).then(response => {
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
    proxy.$modal.confirm('是否确认删除设备管理编号为"' + row.roomId + '"的数据项？').then(function() {
      return delRoom(row.roomId)
    }).then(() => {
      getList()
      proxy.$modal.msgSuccess("删除成功")
    }).catch(() => {})
  }
  
  getList()
  </script>
  