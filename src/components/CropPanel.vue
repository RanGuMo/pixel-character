<template>
  <div v-if="set">
    <h2>✂ 裁切部件</h2>
    <el-input v-model="setName" placeholder="图片名称" size="small" style="margin-bottom:10px" />

    <!-- Grid Controls -->
    <div class="grid-ctrl">
      <el-input-number v-model="gridRows" :min="1" :max="20" size="small" controls-position="right" style="width:70px" />
      <span class="lbl">行</span>
      <el-input-number v-model="gridCols" :min="1" :max="20" size="small" controls-position="right" style="width:70px" />
      <span class="lbl">列</span>
      <el-button size="small" @click="generateGrid">生成</el-button>
    </div>

    <!-- Region List -->
    <h3>区域列表</h3>
    <div
      v-for="reg in regionList" :key="reg.id"
      class="crop-region"
      :class="{ sel: reg.id === store.activeRegionId }"
      @click="store.activeRegionId = reg.id"
    >
      <div class="r-hdr">
        <el-color-picker v-model="reg.color" size="small" :show-alpha="false" @change="onColorChange(reg)" />
        <el-input v-model="reg.label" size="small" style="flex:1" @change="onLabelChange(reg)" />
        <el-button size="small" type="danger" text circle @click.stop="removeRegion(reg.id)">
          <span style="font-size:14px">×</span>
        </el-button>
      </div>
      <div class="r-info">x:{{ reg.x }} y:{{ reg.y }} w:{{ reg.w }} h:{{ reg.h }}</div>
      <div style="margin-top:6px">
        <el-slider v-model="reg.x" :min="0" :max="set.imgW" :step="1" size="small"
          :format-tooltip="v => `X: ${v}`" @input="onSlider(reg)" />
        <el-slider v-model="reg.y" :min="0" :max="set.imgH" :step="1" size="small"
          :format-tooltip="v => `Y: ${v}`" @input="onSlider(reg)" />
        <div style="display:flex;gap:8px">
          <div style="flex:1">
            <div class="s-label">宽 {{ reg.w }}</div>
            <el-slider v-model="reg.w" :min="4" :max="set.imgW" :step="1" size="small" @input="onSlider(reg)" />
          </div>
          <div style="flex:1">
            <div class="s-label">高 {{ reg.h }}</div>
            <el-slider v-model="reg.h" :min="4" :max="set.imgH" :step="1" size="small" @input="onSlider(reg)" />
          </div>
        </div>
      </div>
    </div>

    <el-button size="small" style="width:100%;margin-top:10px" @click="addRegion">+ 添加区域</el-button>
  </div>
  <div v-else>
    <h2>✂ 裁切</h2>
    <p class="hint">点击右上角 "+ 上传图片" 开始裁切。</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const set = computed(() => store.getSet(store.editingSetId))
const regionList = computed(() => Object.values(store.regions))

const setName  = ref('')
const gridRows = ref(2)
const gridCols = ref(2)

// Sync setName with store
import { watch } from 'vue'
watch(() => store.editingSetId, () => {
  if (set.value) setName.value = set.value.name
}, { immediate: true })
watch(setName, v => { if (set.value) set.value.name = v })

const colors = ['#e06666','#f6b26b','#93c47d','#6fa8dc','#d5a6bd','#c27ba0','#8e7cc3','#76a5af','#f4b400','#db4437','#0f9d58','#4285f4']
let colorIdx = 0

function generateGrid () {
  if (!set.value) return
  const r = gridRows.value, c = gridCols.value
  const cw = Math.floor(set.value.imgW / c), ch = Math.floor(set.value.imgH / r)
  store.regions = {}
  let idx = 0
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const id = 'r' + idx
      store.regions[id] = {
        id, label: `区域${idx + 1}`,
        x: col * cw, y: row * ch, w: cw, h: ch,
        color: colors[(colorIdx++) % colors.length]
      }
      idx++
    }
  }
  store.activeRegionId = Object.keys(store.regions)[0] || null
}

function addRegion () {
  if (!set.value) return
  const id = 'r' + Date.now().toString(36)
  store.regions[id] = {
    id, label: '新区域',
    x: 0, y: 0, w: set.value.imgW, h: set.value.imgH,
    color: colors[(colorIdx++) % colors.length]
  }
  store.activeRegionId = id
}

function removeRegion (id) {
  delete store.regions[id]
  store.regions = { ...store.regions } // trigger reactivity
}

function onSlider (reg) {
  store.regions[reg.id] = { ...reg }
}
function onColorChange (reg) {
  store.regions[reg.id] = { ...reg }
}
function onLabelChange (reg) {
  store.regions[reg.id] = { ...reg }
}
</script>

<style scoped>
.grid-ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  margin-top: 10px;
}
.grid-ctrl .lbl { font-size: 12px; color: var(--text2); }
.crop-region {
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: 0.2s;
}
.crop-region.sel {
  border-color: var(--accent);
  background: rgba(255,215,0,0.05);
}
.r-hdr { display: flex; align-items: center; gap: 6px; }
.r-info { font-size: 10px; color: var(--text2); margin-top: 4px; font-family: monospace; }
.s-label { font-size: 11px; color: var(--text2); margin-bottom: 2px; }
.hint { font-size: 12px; color: var(--text2); line-height: 1.7; }
</style>
