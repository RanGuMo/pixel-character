<template>
  <div>
    <h2>📦 分类管理</h2>
    <p class="hint">拖拽部件卡片到分类标题可移动分类</p>

    <div v-for="cat in store.categories" :key="cat.id" class="cat-row">
      <el-color-picker v-model="cat.color" size="small" :show-alpha="false"
        @change="store.updateCategory(cat.id, { color: cat.color })" />
      <el-input v-model="cat.name" size="small" style="flex:1"
        @change="store.updateCategory(cat.id, { name: cat.name })" />
      <span class="cnt">{{ store.partsByCategory(cat.id).length }}</span>
      <el-button size="small" type="danger" text circle @click="onDelete(cat.id)">×</el-button>
    </div>

    <el-button size="small" style="width:100%;margin-top:10px" @click="onAdd">+ 新增分类</el-button>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'
import { ElMessageBox, ElMessage } from 'element-plus'

const store = useAppStore()

async function onAdd () {
  try {
    const { value } = await ElMessageBox.prompt('分类名称：', '新增分类', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (value) {
      store.addCategory(value)
      store.persist()
    }
  } catch {}
}

async function onDelete (id) {
  try {
    await ElMessageBox.confirm('删除此分类？部件将变为未分类。', '确认', { type: 'warning' })
    store.removeCategory(id)
    store.persist()
  } catch {}
}
</script>

<style scoped>
.hint { font-size: 11px; color: var(--text2); margin-bottom: 10px; }
.cat-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; background: rgba(255,255,255,0.03);
  border-radius: 6px; margin-bottom: 6px;
}
.cnt { font-size: 10px; color: var(--text2); min-width: 16px; text-align: center; }
</style>
