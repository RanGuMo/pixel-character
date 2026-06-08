<template>
  <div>
    <h2>🖼 图片拼接</h2>

    <!-- Canvas Settings -->
    <h3>画布设置</h3>
    <div class="setting-row">
      <span class="s-label">画布尺寸</span>
      <el-radio-group v-model="sizeMode" size="small">
        <el-radio-button value="auto">自动</el-radio-button>
        <el-radio-button value="manual">手动</el-radio-button>
      </el-radio-group>
    </div>
    <div v-if="sizeMode === 'manual'" style="display:flex;gap:8px;margin-top:6px">
      <div style="flex:1">
        <div class="s-label">宽</div>
        <el-input-number v-model="canvasWidth" :min="10" :max="8000" size="small" controls-position="right" style="width:100%" @change="$emit('update:canvasWidth', canvasWidth)" />
      </div>
      <div style="flex:1">
        <div class="s-label">高</div>
        <el-input-number v-model="canvasHeight" :min="10" :max="8000" size="small" controls-position="right" style="width:100%" @change="$emit('update:canvasHeight', canvasHeight)" />
      </div>
    </div>

    <div class="setting-row" style="margin-top:8px">
      <span class="s-label">背景</span>
      <el-radio-group v-model="bgMode" size="small" @change="onBgModeChange">
        <el-radio-button value="transparent">透明</el-radio-button>
        <el-radio-button value="color">纯色</el-radio-button>
      </el-radio-group>
    </div>
    <div v-if="bgMode === 'color'" style="margin-top:6px;display:flex;align-items:center;gap:8px">
      <el-color-picker v-model="bgColor" :show-alpha="false" size="small" @change="$emit('update:bgColor', bgColor)" />
      <span class="s-label">{{ bgColor }}</span>
    </div>

    <div class="setting-row" style="margin-top:8px">
      <span class="s-label">显示缩放</span>
      <el-slider v-model="displayScale" :min="0.1" :max="3" :step="0.1" size="small" style="flex:1"
        @input="$emit('update:displayScale', displayScale)" />
      <span class="s-val">{{ displayScale.toFixed(1) }}x</span>
    </div>

    <!-- Layout Mode -->
    <h3>排列方式</h3>
    <div class="setting-row">
      <el-radio-group v-model="layoutMode" size="small" @change="$emit('update:mode', layoutMode)">
        <el-radio-button value="free">自由拖拽</el-radio-button>
        <el-radio-button value="grid">网格排列</el-radio-button>
      </el-radio-group>
    </div>
    <div v-if="layoutMode === 'grid'" style="margin-top:8px">
      <div style="display:flex;gap:8px">
        <div style="flex:1">
          <div class="s-label">行</div>
          <el-input-number v-model="gridRows" :min="1" :max="20" size="small" controls-position="right" style="width:100%" @change="$emit('update:gridRows', gridRows)" />
        </div>
        <div style="flex:1">
          <div class="s-label">列</div>
          <el-input-number v-model="gridCols" :min="1" :max="20" size="small" controls-position="right" style="width:100%" @change="$emit('update:gridCols', gridCols)" />
        </div>
        <div style="flex:1">
          <div class="s-label">间距</div>
          <el-input-number v-model="gridGap" :min="0" :max="200" size="small" controls-position="right" style="width:100%" @change="$emit('update:gridGap', gridGap)" />
        </div>
      </div>
      <el-button size="small" style="width:100%;margin-top:8px" @click="applyGrid">应用网格</el-button>
    </div>

    <!-- Layer List -->
    <h3>图层 ({{ images.length }})
      <span v-if="images.length > 1" class="reorder-hint">拖拽排序 / 点击箭头</span>
    </h3>
    <div v-if="!images.length" class="empty-hint">暂无图片，请先上传</div>
    <div
      v-for="(img, idx) in images" :key="img.id"
      class="layer-item"
      :class="{ 'drag-over': dragOverId === img.id }"
      draggable="true"
      @click="$emit('selectLayer', img.id)"
      @dragstart="onLayerDragStart($event, idx)"
      @dragover.prevent="dragOverId = img.id"
      @dragleave="dragOverId = null"
      @drop.prevent="onLayerDrop($event, idx)"
      @dragend="dragOverId = null"
    >
      <span class="layer-idx">{{ idx + 1 }}</span>
      <span class="layer-name">{{ img.name }}</span>
      <div class="layer-wh">
        <el-input-number v-model="img.w" :min="1" :max="8000" size="small" controls-position="right"
          style="width:76px" @change="(v) => onResize(img.id, 'w', v)" />
        <span class="wh-sep">×</span>
        <el-input-number v-model="img.h" :min="1" :max="8000" size="small" controls-position="right"
          style="width:76px" @change="(v) => onResize(img.id, 'h', v)" />
        <button class="btn-icon" title="重置原始尺寸" @click.stop="resetSize(img)">↺</button>
      </div>
      <div class="layer-actions">
        <button class="btn-icon" title="上移" :disabled="idx === 0" @click.stop="moveUp(idx)">▲</button>
        <button class="btn-icon" title="下移" :disabled="idx === images.length - 1" @click.stop="moveDown(idx)">▼</button>
        <el-button size="small" type="danger" text circle @click.stop="$emit('deleteLayer', img.id)">×</el-button>
      </div>
    </div>
    <div v-if="images.length > 1" style="margin-top:6px">
      <el-button size="small" style="width:100%" @click="unifySizes">统一所有图片尺寸（以第1张为准）</el-button>
    </div>

    <!-- Export -->
    <div style="margin-top:16px;display:flex;gap:8px">
      <el-button type="warning" style="flex:1" @click="$emit('export')" :disabled="!images.length">
        导出 PNG
      </el-button>
      <el-button type="danger" text @click="$emit('clearAll')" :disabled="!images.length">
        清空
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  mode: { type: String, default: 'free' },
  gridRows: { type: Number, default: 1 },
  gridCols: { type: Number, default: 2 },
  gridGap: { type: Number, default: 0 },
  canvasWidth: { type: Number, default: 0 },
  canvasHeight: { type: Number, default: 0 },
  bgColor: { type: String, default: 'transparent' },
  displayScale: { type: Number, default: 1 },
})

const emit = defineEmits([
  'update:images',
  'update:mode', 'update:gridRows', 'update:gridCols', 'update:gridGap',
  'update:canvasWidth', 'update:canvasHeight', 'update:bgColor', 'update:displayScale',
  'applyGrid', 'export', 'clearAll', 'deleteLayer', 'selectLayer', 'resizeLayer'
])

const images = props.images

const sizeMode = ref(props.canvasWidth > 0 || props.canvasHeight > 0 ? 'manual' : 'auto')
const bgMode = ref(props.bgColor === 'transparent' ? 'transparent' : 'color')
const layoutMode = ref(props.mode)
const gridRows = ref(props.gridRows)
const gridCols = ref(props.gridCols)
const gridGap = ref(props.gridGap)
const canvasWidth = ref(props.canvasWidth || 800)
const canvasHeight = ref(props.canvasHeight || 600)
const bgColor = ref(props.bgColor === 'transparent' ? '#ffffff' : props.bgColor)
const displayScale = ref(props.displayScale)

watch(sizeMode, v => {
  if (v === 'auto') {
    emit('update:canvasWidth', 0)
    emit('update:canvasHeight', 0)
  } else {
    emit('update:canvasWidth', canvasWidth.value)
    emit('update:canvasHeight', canvasHeight.value)
  }
})

function onBgModeChange () {
  emit('update:bgColor', bgMode.value === 'transparent' ? 'transparent' : bgColor.value)
}

watch(bgColor, v => {
  if (bgMode.value === 'color') emit('update:bgColor', v)
})

function applyGrid () {
  emit('applyGrid')
}

// ── Layer reorder ───────────────────────────────────
const dragLayerIdx = ref(null)
const dragOverId = ref(null)

function moveUp (idx) {
  if (idx <= 0) return
  const arr = [...props.images]
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  emit('update:images', arr)
}

function moveDown (idx) {
  if (idx >= props.images.length - 1) return
  const arr = [...props.images]
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  emit('update:images', arr)
}

function onLayerDragStart (e, idx) {
  dragLayerIdx.value = idx
  e.dataTransfer.effectAllowed = 'move'
}

function onLayerDrop (e, targetIdx) {
  dragOverId.value = null
  const fromIdx = dragLayerIdx.value
  if (fromIdx === null || fromIdx === targetIdx) return
  const arr = [...props.images]
  const [item] = arr.splice(fromIdx, 1)
  arr.splice(targetIdx, 0, item)
  emit('update:images', arr)
  dragLayerIdx.value = null
}
</script>

<style scoped>
.setting-row {
  display: flex; align-items: center; gap: 8px;
}
.s-label { font-size: 12px; color: var(--text2); white-space: nowrap; }
.s-val { font-size: 12px; color: var(--accent); min-width: 32px; text-align: right; }
.empty-hint { font-size: 12px; color: var(--text2); padding: 8px 0; }
.layer-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; background: rgba(255,255,255,0.03);
  border-radius: 6px; margin-bottom: 4px; cursor: grab;
  transition: background 0.2s, border-color 0.2s;
  font-size: 12px; border: 2px solid transparent;
}
.layer-item:hover { background: rgba(255,255,255,0.06); }
.layer-item.drag-over { border-color: var(--accent); background: rgba(255,215,0,0.08); }
.layer-item:active { cursor: grabbing; }
.layer-idx {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent); color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-size { font-size: 10px; color: var(--text2); flex-shrink: 0; }
.layer-actions { display: flex; gap: 2px; flex-shrink: 0; align-items: center; }
.btn-icon {
  width: 20px; height: 20px; padding: 0; border: none;
  background: rgba(255,255,255,0.08); border-radius: 4px;
  color: var(--text2); cursor: pointer; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
  transition: 0.15s;
}
.btn-icon:hover:not(:disabled) { background: var(--accent); color: #000; }
.btn-icon:disabled { opacity: 0.25; cursor: default; }
.reorder-hint { font-size: 10px; color: var(--text2); font-weight: normal; margin-left: 6px; }
</style>
