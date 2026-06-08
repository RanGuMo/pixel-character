<template>
  <div class="preset-bar">
    <div
      v-for="pr in store.presets" :key="pr.id"
      class="preset-card"
      :class="{ on: pr.id === store.activePresetId }"
      @click="store.loadPreset(pr.id)"
      @contextmenu.prevent="onContextMenu($event, pr.id)"
    >
      {{ pr.name }}
    </div>
    <div class="preset-add" @click="onAdd">+ 新建</div>

    <!-- Context menu -->
    <el-dropdown
      v-if="ctxMenu.visible"
      :style="{ position: 'fixed', left: ctxMenu.x + 'px', top: ctxMenu.y + 'px', zIndex: 1000 }"
      trigger="click"
      @command="onCommand"
      @visible-change="v => { if (!v) ctxMenu.visible = false }"
    >
      <span style="display:none" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="rename">重命名</el-dropdown-item>
          <el-dropdown-item command="delete" divided style="color:var(--danger)">删除</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import { ElMessageBox } from 'element-plus'

const store = useAppStore()

const ctxMenu = reactive({ visible: false, x: 0, y: 0, presetId: null })

async function onAdd () {
  try {
    const { value } = await ElMessageBox.prompt('预设名称：', '新建预设', {
      inputValue: '预设 ' + (store.presets.length + 1),
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (value) store.addPreset(value)
  } catch {}
}

function onContextMenu (e, id) {
  ctxMenu.presetId = id
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.visible = true
  // Auto-open dropdown
  nextTick(() => {
    const trigger = document.querySelector('.el-dropdown')
    if (trigger) trigger.click()
  })
}

async function onCommand (cmd) {
  const id = ctxMenu.presetId
  ctxMenu.visible = false
  if (cmd === 'rename') {
    try {
      const pr = store.presets.find(p => p.id === id)
      const { value } = await ElMessageBox.prompt('预设名称：', '重命名', { inputValue: pr?.name })
      if (value && pr) { pr.name = value; store.persist() }
    } catch {}
  }
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm('删除此预设？', '确认', { type: 'warning' })
      store.removePreset(id)
      store.persist()
    } catch {}
  }
}
</script>

<style scoped>
.preset-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: var(--panel);
  border-top: 1px solid var(--border);
  overflow-x: auto; min-height: 50px; flex-shrink: 0;
}
.preset-card {
  flex-shrink: 0; padding: 6px 14px;
  border-radius: 6px; cursor: pointer; font-size: 12px;
  border: 1px solid var(--border); background: rgba(255,255,255,0.03);
  color: var(--text2); transition: 0.2s; white-space: nowrap;
}
.preset-card:hover { background: rgba(255,255,255,0.06); }
.preset-card.on { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.preset-add {
  flex-shrink: 0; padding: 6px 14px;
  border: 1px dashed var(--border); border-radius: 6px;
  cursor: pointer; font-size: 12px; color: var(--text2); transition: 0.2s;
}
.preset-add:hover { border-color: var(--accent); color: var(--accent); }
</style>
