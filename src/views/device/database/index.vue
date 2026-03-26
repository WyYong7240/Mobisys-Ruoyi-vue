<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧树状图 -->
      <el-col :span="4">
        <div class="tree-container">
          <el-input v-model="treeSearch" placeholder="搜索设备" clearable prefix-icon="el-icon-search" style="margin-bottom: 15px" />
          <el-tree
            :data="deviceTree"
            :props="treeProps"
            :filter-node-method="filterNode"
            node-key="deviceId"
            ref="deviceTree"
            highlight-current
            default-expand-all
            @node-click="handleNodeClick"/>
        </div>
      </el-col>
      
      <!-- 右侧内容 -->
      <el-col :span="20">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="88px">
          <el-form-item label="数据库名称" prop="databaseName">
            <el-input
              v-model="queryParams.databaseName"
              placeholder="请输入数据库名称"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="数据库用户名" prop="username">
            <el-input
              v-model="queryParams.username"
              placeholder="请输入数据库用户名"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="负责人" prop="leader">
            <el-input
              v-model="queryParams.leader"
              placeholder="请输入负责人"
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
              v-hasPermi="['device:database:add']"
            >新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="success"
              plain
              icon="el-icon-edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['device:database:edit']"
              size="mini"
            >修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="danger"
              plain
              icon="el-icon-delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['device:database:remove']"
              size="mini"
            >删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="warning"
              plain
              icon="el-icon-download"
              @click="handleExport"
              v-hasPermi="['device:database:export']"
              size="mini"
            >导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="databaseList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="数据库实例ID" align="center" prop="databaseId" />
          <el-table-column label="设备类型" align="center" prop="deviceId">
            <template #default="scope">
              {{ getDeviceName(scope.row.deviceId) }}
            </template>
          </el-table-column>
          <el-table-column label="数据库名称" align="center" prop="databaseName" />
          <el-table-column label="数据库状态" align="center" prop="status">
            <template #default="scope">
              <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'">
                {{ scope.row.status === 0 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="数据库实例IP地址" align="center" prop="ipAddress" />
          <el-table-column label="端口号" align="center" prop="port" />
          <el-table-column label="数据库用户名" align="center" prop="username" />
          <el-table-column label="负责人" align="center" prop="leader" />
          <el-table-column label="操作" align="center" width="250" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-button
                size="mini"
                type="text"
                icon="el-icon-edit"
                @click="handleUpdate(scope.row)"
                v-hasPermi="['device:database:edit']"
              >修改</el-button>
              <el-button
                size="mini"
                type="text"
                icon="el-icon-delete"
                @click="handleDelete(scope.row)"
                v-hasPermi="['device:database:remove']"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <pagination
          v-show="total>0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />

        <!-- 添加或修改数据库管理对话框 -->
        <el-dialog :title="title" v-model="open" width="500px" append-to-body>
          <el-form ref="databaseRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="设备类型" prop="deviceId">
              <el-select v-model="form.deviceId" placeholder="请选择设备类型" style="width: 100%">
                <el-option
                  v-for="item in deviceOptions"
                  :key="item.deviceId"
                  :label="item.deviceName"
                  :value="item.deviceId"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数据库名称" prop="databaseName">
              <el-input v-model="form.databaseName" placeholder="请输入数据库名称" />
            </el-form-item>
            <el-form-item label="数据库状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :label="0">正常</el-radio>
                <el-radio :label="1">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="数据库ip地址" prop="ipAddress">
              <el-input v-model="form.ipAddress" placeholder="请输入数据库ip地址" />
            </el-form-item>
            <el-form-item label="端口号" prop="port">
              <el-input v-model="form.port" placeholder="请输入端口号" />
            </el-form-item>
            <el-form-item label="数据库用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入数据库用户名" />
            </el-form-item>
            <el-form-item label="数据库密码" prop="password">
              <el-input v-model="form.password" placeholder="请输入数据库密码" show-password />
            </el-form-item>
            <el-form-item label="负责人" prop="leader">
              <el-input v-model="form.leader" placeholder="请输入负责人" />
            </el-form-item>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </div>
        </el-dialog>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { listDatabase, getDatabase, delDatabase, addDatabase, updateDatabase } from "@/api/device/database"
import { listDeviceManagerTree } from "@/api/device/master"

export default {
  name: "Database",
  data() {
    return {
      // 遮罩层
      loading: true,
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 数据库表格数据
      databaseList: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,
      // 树状图数据
      deviceTree: [],
      // 设备类型下拉选项
      deviceOptions: [],
      // 树状图搜索关键词
      treeSearch: '',
      // 树状图配置
      treeProps: {
        children: 'children',
        label: 'deviceName'
      },
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        databaseName: null,
        username: null,
        leader: null,
        deviceId: null
      },
      // 表单参数
      form: {},
      // 表单校验
      rules: {
        deviceId: [
          { required: true, message: "设备类型不能为空", trigger: "blur" }
        ],
        databaseName: [
          { required: true, message: "数据库名称不能为空", trigger: "blur" }
        ],
        status: [
          { required: true, message: "数据库状态不能为空", trigger: "blur" }
        ],
        ipAddress: [
          { required: true, message: "数据库ip地址不能为空", trigger: "blur" }
        ],
        port: [
          { required: true, message: "端口号不能为空", trigger: "blur" }
        ],
        username: [
          { required: true, message: "数据库用户名不能为空", trigger: "blur" }
        ],
        password: [
          { required: true, message: "数据库密码不能为空", trigger: "blur" }
        ],
      }
    }
  },
  created() {
    this.getList()
    this.getDeviceTree()
  },
  watch: {
    // 监听树状图搜索
    treeSearch(val) {
      this.$refs.deviceTree.filter(val)
    }
  },
  methods: {
    /** 查询数据库管理列表 */
    getList() {
      this.loading = true
      listDatabase(this.queryParams).then(response => {
        this.databaseList = response.rows
        this.total = response.total
        this.loading = false
      })
    },
    
    /** 获取设备树状图数据 */
    getDeviceTree() {
      listDeviceManagerTree().then(response => {
        console.log('树状图数据:', response.data)
        this.deviceTree = this.buildTree(response.data, 0)
        console.log('构建后的树状图数据:', this.deviceTree)
        // 只保留"数据库设备"这个根节点
        if (this.deviceTree && this.deviceTree.length > 0) {
          const databaseDeviceNode = this.deviceTree.find(node => node.deviceName === '数据库种类')
          if (databaseDeviceNode) {
            this.deviceTree = [databaseDeviceNode]
            console.log('过滤后的树状图数据:', this.deviceTree)
          }
        }
        // 树状图数据加载完成后，再获取设备类型下拉选项
        this.getDeviceOptions()
      }).catch(error => {
        console.error('获取树状图数据失败:', error)
      })
    },
    
    /** 构建树状结构 */
    buildTree(data, parentId) {
      const result = []
      console.log('构建树状结构，parentId:', parentId)
      for (const item of data) {
        console.log('item:', item)
        if (item.parentId === parentId) {
          console.log('找到匹配的item:', item)
          const children = this.buildTree(data, item.deviceId)
          if (children.length > 0) {
            item.children = children
          }
          result.push(item)
        }
      }
      console.log('构建后的树状结构:', result)
      return result
    },
    
    /** 获取设备类型下拉选项（排除根节点） */
    getDeviceOptions() {
      this.deviceOptions = []
      // 从树状图数据中提取所有设备类型（排除根节点）
      if (this.deviceTree && this.deviceTree.length > 0) {
        console.log('开始提取设备类型选项')
        // 遍历树状图的每个根节点
        this.deviceTree.forEach(rootNode => {
          console.log('根节点:', rootNode)
          // 如果根节点有子节点，提取这些子节点作为选项
          if (rootNode.children && rootNode.children.length > 0) {
            rootNode.children.forEach(child => {
              console.log('子节点:', child)
              this.deviceOptions.push({
                deviceId: child.deviceId,
                deviceName: child.deviceName
              })
            })
          }
        })
      }
      console.log('设备类型下拉选项:', this.deviceOptions)
    },
    
    /** 根据deviceId获取设备名称 */
    getDeviceName(deviceId) {
      const device = this.deviceOptions.find(item => item.deviceId === deviceId)
      return device ? device.deviceName : deviceId
    },
    
    /** 过滤树状图节点 */
    filterNode(value, data) {
      if (!value) return true
      return data.deviceName.indexOf(value) !== -1
    },
    
    /** 树状图节点点击事件 */
    handleNodeClick(data) {
      console.log('点击了节点:', data)
      
      if (data && data.deviceId) {
        // 判断是否为根节点（parentId为0）
        if (data.parentId === 0) {
          // 点击根节点（如"数据库设备"），显示全部数据
          this.queryParams.deviceId = null
          this.queryParams.pageNum = 1
          this.getList()
          this.$modal.msgSuccess('已显示全部数据库数据')
        } else {
          // 点击子节点（如"MySQL"），根据deviceId筛选数据
          this.queryParams.deviceId = data.deviceId
          this.queryParams.pageNum = 1
          this.getList()
          this.$modal.msgSuccess(`已筛选设备类型: ${data.deviceName}`)
        }
      }
    },
    
    // 取消按钮
    cancel() {
      this.open = false
      this.reset()
    },
    
    // 表单重置
    reset() {
      this.form = {
        databaseId: null,
        deviceId: null,
        databaseName: null,
        status: null,
        ipAddress: null,
        port: null,
        username: null,
        password: null,
        createTime: null,
        leader: null
      }
      this.resetForm("databaseRef")
    },
    
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm")
      this.handleQuery()
    },
    
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.databaseId)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    
    /** 新增按钮操作 */
    handleAdd() {
      this.reset()
      this.open = true
      this.title = "添加数据库管理"
    },
    
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset()
      const _databaseId = row.databaseId || this.ids
      getDatabase(_databaseId).then(response => {
        this.form = response.data
        this.open = true
        this.title = "修改数据库管理"
      })
    },
    
    /** 提交按钮 */
    submitForm() {
      this.$refs["databaseRef"].validate(valid => {
        if (valid) {
          if (this.form.databaseId != null) {
            updateDatabase(this.form).then(response => {
              this.$modal.msgSuccess("修改成功")
              this.open = false
              this.getList()
            })
          } else {
            addDatabase(this.form).then(response => {
              this.$modal.msgSuccess("新增成功")
              this.open = false
              this.getList()
            })
          }
        }
      })
    },
    
    /** 删除按钮操作 */
    handleDelete(row) {
      const _databaseIds = row.databaseId || this.ids
      this.$modal.confirm('是否确认删除数据库管理编号为"' + _databaseIds + '"的数据项？').then(function() {
        return delDatabase(_databaseIds)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess("删除成功")
      }).catch(() => {})
    },
    
    /** 导出按钮操作 */
    handleExport() {
      this.download('device/database/export', {
        ...this.queryParams
      }, `database_${new Date().getTime()}.xlsx`)
    }
  }
}
</script>

<style scoped>
.tree-container {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  min-height: calc(100vh - 180px);
}
</style>
