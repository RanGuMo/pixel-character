<template>
  <el-container style="height: 100vh">
    <!-- Top Bar -->
    <el-header height="48px" class="top-bar">
      <h1 class="logo">⚔ 像素角色</h1>
      <el-radio-group v-model="store.mode" size="small" @change="onModeChange">
        <el-radio-button value="crop">✂ 裁切</el-radio-button>
        <el-radio-button value="library">📦 部件库</el-radio-button>
        <el-radio-button value="assemble">🎮 混搭</el-radio-button>
      </el-radio-group>
      <div style="flex:1" />
      <el-switch v-model="isDark" size="small" inline-prompt active-text="🌙" inactive-text="☀️" @change="toggleTheme" />
      <el-button size="small" @click="triggerUpload">+ 上传图片</el-button>
      <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileChange" />
    </el-header>

    <!-- Main -->
    <el-container>
      <!-- Canvas -->
      <el-main class="canvas-bg" style="padding:0;overflow:hidden;position:relative">
        <CropView   v-show="store.mode === 'crop'" />
        <LibraryView v-show="store.mode === 'library'" />
        <AssemblyView v-show="store.mode === 'assemble'" />
      </el-main>

      <!-- Right Panel -->
      <el-aside width="310px" class="panel-aside">
        <CropPanel    v-if="store.mode === 'crop'" />
        <CategoryPanel v-if="store.mode === 'library'" />
        <AssemblyPanel v-if="store.mode === 'assemble'" />
      </el-aside>
    </el-container>

    <!-- Preset Bar -->
    <PresetBar />

    <!-- Part Picker Modal -->
    <PartPickerModal />
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from './stores/app'
import CropView from './components/CropView.vue'
import CropPanel from './components/CropPanel.vue'
import LibraryView from './components/LibraryView.vue'
import CategoryPanel from './components/CategoryPanel.vue'
import AssemblyView from './components/AssemblyView.vue'
import AssemblyPanel from './components/AssemblyPanel.vue'
import PresetBar from './components/PresetBar.vue'
import PartPickerModal from './components/PartPickerModal.vue'

const store = useAppStore()
const fileInputRef = ref(null)
const isDark = ref(true)

const THEME_KEY = 'pixel_char_theme'

function applyTheme (dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

function toggleTheme (val) {
  applyTheme(val)
}

onMounted(() => {
  // Restore theme preference
  const saved = localStorage.getItem(THEME_KEY)
  const preferDark = saved ? saved === 'dark' : true
  applyTheme(preferDark)

  store.load()
  store.initAssembly()
  if (store.presets.length) store.loadPreset(store.presets[0].id)
})

function triggerUpload () { fileInputRef.value?.click() }

function onFileChange (e) {
  const file = e.target.files[0]
  if (file) onFilePicked(file)
  e.target.value = ''
}

function onFilePicked (file) {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const set = store.addSet('精灵图 ' + (store.sets.length + 1), e.target.result, img.width, img.height)
      store.editingSetId = set.id
      initDefaultRegions(img.width, img.height)
      store.mode = 'crop'
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

function initDefaultRegions (iw, ih) {
  const hw = Math.floor(iw / 2), hh = Math.floor(ih / 2)
  const colors = ['#e06666','#f6b26b','#93c47d','#6fa8dc']
  store.regions = {
    r0: { id:'r0', label:'区域1', x:0,  y:0,  w:hw, h:hh, color:colors[0] },
    r1: { id:'r1', label:'区域2', x:hw, y:0,  w:hw, h:hh, color:colors[1] },
    r2: { id:'r2', label:'区域3', x:0,  y:hh, w:hw, h:hh, color:colors[2] },
    r3: { id:'r3', label:'区域4', x:hw, y:hh, w:hw, h:hh, color:colors[3] }
  }
  store.activeRegionId = 'r0'
}

function onModeChange () {
  if (store.mode === 'assemble' && !store.activePresetId && store.presets.length) {
    store.loadPreset(store.presets[0].id)
  }
}
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  transition: background 0.3s, border-color 0.3s;
}
.logo {
  font-size: 14px;
  color: var(--accent);
  letter-spacing: 1px;
  white-space: nowrap;
}
.panel-aside {
  background: var(--panel);
  border-left: 1px solid var(--border);
  overflow-y: auto;
  padding: 16px;
  transition: background 0.3s, border-color 0.3s;
}
</style>
