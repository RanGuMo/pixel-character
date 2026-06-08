<template>
  <div>
    <h2>🎮 混搭配置</h2>

    <!-- Global controls -->
    <div class="global-section">
      <div class="toggle-row">
        <span>朝向</span>
        <div>
          <el-button :type="store.facingLeft ? 'warning' : 'default'" size="small" @click="setFacing(true)">← 左</el-button>
          <el-button :type="!store.facingLeft ? 'warning' : 'default'" size="small" @click="setFacing(false)">右 →</el-button>
        </div>
      </div>
      <div class="toggle-row">
        <span>待机动画</span>
        <el-switch v-model="store.animOn" @change="store.saveCurrentPreset()" />
      </div>
      <div class="slider-row">
        <label>动画速度 <span>{{ store.animSpeed.toFixed(1) }}s</span></label>
        <el-slider v-model="store.animSpeed" :min="0.4" :max="3" :step="0.1" size="small"
          @input="store.saveCurrentPreset()" />
      </div>
      <div class="slider-row">
        <label>整体缩放 <span>{{ store.globalScale }}x</span></label>
        <el-slider v-model="store.globalScale" :min="3" :max="20" :step="1" size="small"
          @input="onGlobalScaleChange" />
      </div>
    </div>

    <!-- Part slots -->
    <h3>选择部件 <span v-if="store.categories.length > 1" class="mix-hint">可混搭不同套装</span></h3>

    <el-collapse v-model="openCats">
      <el-collapse-item v-for="cat in store.categories" :key="cat.id" :name="cat.id">
        <template #title>
          <span class="dot" :style="{ background: cat.color }" />
          <span class="slot-name">{{ cat.name }}</span>
          <span class="slot-src">{{ getPartSetName(cat.id) }}</span>
        </template>

        <!-- Pick button -->
        <div class="pick-btn" @click="openPicker(cat.id)">
          <canvas v-if="getSlotPart(cat.id)" :ref="el => setPickThumb(el, cat.id)" width="28" height="28" class="pixelated" />
          <span class="pick-name">{{ getSlotPart(cat.id)?.name || '— 点击选择 —' }}</span>
          <span class="pick-change">更换</span>
        </div>

        <!-- Adjustments -->
        <div class="slider-row">
          <label>X 偏移 <span>{{ adj(cat.id).ox }}</span></label>
          <el-slider v-model="adj(cat.id).ox" :min="-800" :max="800" :step="1" size="small" @input="store.saveCurrentPreset()" />
        </div>
        <div class="slider-row">
          <label>Y 偏移 <span>{{ adj(cat.id).oy }}</span></label>
          <el-slider v-model="adj(cat.id).oy" :min="-800" :max="800" :step="1" size="small" @input="store.saveCurrentPreset()" />
        </div>
        <div class="slider-row">
          <label>缩放 <span>{{ adj(cat.id).scale.toFixed(2) }}</span></label>
          <el-slider v-model="adj(cat.id).scale" :min="0.5" :max="2" :step="0.05" size="small" @input="store.saveCurrentPreset()" />
        </div>
        <div class="slider-row">
          <label>层级 <span>{{ adj(cat.id).z }}</span></label>
          <el-slider v-model="adj(cat.id).z" :min="1" :max="20" :step="1" size="small" @input="store.saveCurrentPreset()" />
        </div>
        <el-button size="small" style="width:100%;margin-top:4px" @click="resetAdj(cat.id)">重置</el-button>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const openCats = ref([])

// Open first category by default
if (store.categories.length && !openCats.value.length) {
  openCats.value = [store.categories[0].id]
}

function adj (catId) {
  if (!store.partAdj[catId]) {
    const cat = store.getCat(catId)
    store.partAdj[catId] = { ox: 0, oy: 0, scale: 1, z: cat?.zIdx || 5 }
  }
  return store.partAdj[catId]
}

function getSlotPart (catId) {
  const pid = store.slots[catId]
  return pid ? store.getPart(pid) : null
}

function getPartSetName (catId) {
  const part = getSlotPart(catId)
  if (!part) return ''
  const set = store.getSet(part.setId)
  return set?.name || ''
}

function setFacing (left) {
  store.facingLeft = left
  store.saveCurrentPreset()
}

function onGlobalScaleChange () {
  store.saveCurrentPreset()
}

function resetAdj (catId) {
  const cat = store.getCat(catId)
  if (!cat) return
  store.partAdj[catId] = { ox: 0, oy: 0, scale: 1, z: cat.zIdx }
  store.saveCurrentPreset()
}

function setPickThumb (el, catId) {
  if (!el) return
  const part = getSlotPart(catId)
  if (!part) return
  const set = store.getSet(part.setId)
  if (!set) return
  const img = new Image()
  img.onload = () => {
    const ctx = el.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const r = part.region
    const sc = Math.min(28 / r.w, 28 / r.h)
    ctx.drawImage(img, r.x, r.y, r.w, r.h, (28 - r.w * sc) / 2, (28 - r.h * sc) / 2, r.w * sc, r.h * sc)
  }
  img.src = set.imgData
}

function openPicker (catId) {
  pickerCatId.value = catId
  // Trigger modal via event or store
  window.dispatchEvent(new CustomEvent('open-part-picker', { detail: { catId } }))
}

// Expose for PartPickerModal
const pickerCatId = ref(null)
</script>

<style scoped>
.global-section { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px; }
.slider-row { margin-bottom: 6px; }
.slider-row label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); margin-bottom: 2px; }
.slider-row label span { color: var(--accent); font-variant-numeric: tabular-nums; }
.mix-hint { font-size: 10px; color: var(--accent); }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
.slot-name { font-size: 13px; font-weight: 600; }
.slot-src { font-size: 10px; color: var(--text2); margin-left: 4px; }
.pick-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px; margin-bottom: 8px;
  background: rgba(255,255,255,0.04); border: 1px dashed var(--border);
  border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 12px;
}
.pick-btn:hover { border-color: var(--accent); color: var(--accent); }
.pick-btn canvas { border-radius: 3px; flex-shrink: 0; }
.pick-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-change { font-size: 10px; color: var(--accent); opacity: 0; transition: 0.2s; }
.pick-btn:hover .pick-change { opacity: 1; }
</style>
