<template>
  <div class="crop-view">
    <!-- Upload zone (shown when no set is being edited) -->
    <div v-if="!store.editingSetId" class="upload-zone" @click="triggerUpload">
      <h3>上传精灵图</h3>
      <p>点击此处上传，或拖拽图片到此区域</p>
      <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileChange" />
    </div>

    <!-- Sprite Editor -->
    <SpriteEditor v-else />

    <!-- Save button -->
    <el-button v-if="store.editingSetId" type="warning" @click="saveParts" style="margin-top:8px">
      保存部件到库 →
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '../stores/app'
import SpriteEditor from './SpriteEditor.vue'

const store = useAppStore()
const fileInputRef = ref(null)

function triggerUpload () { fileInputRef.value?.click() }

function onFileChange (e) {
  const file = e.target.files[0]
  if (!file || !file.type.startsWith('image/')) return
  e.target.value = ''
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      const set = store.addSet('精灵图 ' + (store.sets.length + 1), ev.target.result, img.width, img.height)
      store.editingSetId = set.id
      initDefaultRegions(img.width, img.height)
      store.mode = 'crop'
    }
    img.src = ev.target.result
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

function saveParts () {
  const set = store.getSet(store.editingSetId)
  if (!set) return
  const regions = Object.values(store.regions)
  if (!regions.length) return

  regions.forEach(reg => {
    const matchedCat = store.categories.find(c => reg.label.includes(c.name))
    const catId = matchedCat ? matchedCat.id : (store.categories[0]?.id || null)
    store.addPart(reg.label, catId, set.id, { x: reg.x, y: reg.y, w: reg.w, h: reg.h })
  })

  store.persist()
  ElMessage.success(`已保存 ${regions.length} 个部件到部件库`)
  store.mode = 'library'
}
</script>

<style scoped>
.crop-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}
.upload-zone {
  padding: 40px;
  border: 2px dashed var(--border);
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  max-width: 380px;
}
.upload-zone:hover {
  border-color: var(--accent);
  background: rgba(255, 215, 0, 0.05);
}
.upload-zone h3 { margin-bottom: 6px; }
.upload-zone p  { color: var(--text2); font-size: 13px; }
</style>
