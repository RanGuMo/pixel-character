<template>
  <div class="stitch-view">
    <!-- Upload zone when no images -->
    <div v-if="!images.length" class="upload-zone" @click="triggerUpload">
      <h3>添加图片</h3>
      <p>点击选择多张图片进行拼接</p>
    </div>

    <!-- Canvas area -->
    <div v-else class="canvas-area" ref="canvasAreaRef" @drop.prevent="onDrop" @dragover.prevent>
      <div
        class="stitch-canvas"
        :style="canvasStyle"
      >
        <div
          v-for="(img, idx) in images" :key="img.id"
          class="layer"
          :class="{ selected: selectedId === img.id }"
          :style="layerStyle(img, idx)"
          @pointerdown="selectLayer(img.id)"
        >
          <!-- Drag body -->
          <div class="layer-body" @pointerdown="startDrag($event, img.id)" />
          <!-- Resize handles -->
          <div v-if="selectedId === img.id" class="rh tl" @pointerdown.stop="startResize($event, img.id, 'tl')" />
          <div v-if="selectedId === img.id" class="rh tr" @pointerdown.stop="startResize($event, img.id, 'tr')" />
          <div v-if="selectedId === img.id" class="rh bl" @pointerdown.stop="startResize($event, img.id, 'bl')" />
          <div v-if="selectedId === img.id" class="rh br" @pointerdown.stop="startResize($event, img.id, 'br')" />
          <img :src="img.data" class="pixelated layer-img" draggable="false" />
          <div class="layer-label">{{ img.name }}</div>
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input ref="fileInputRef" type="file" accept="image/*" multiple style="display:none" @change="onFileChange" />
    <!-- Add more button -->
    <el-button v-if="images.length" size="small" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%)" @click="triggerUpload">
      + 添加更多图片
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'free' },       // 'free' | 'grid'
  gridRows: { type: Number, default: 1 },
  gridCols: { type: Number, default: 2 },
  gridGap: { type: Number, default: 0 },
  canvasWidth: { type: Number, default: 0 },     // 0 = auto
  canvasHeight: { type: Number, default: 0 },    // 0 = auto
  bgColor: { type: String, default: 'transparent' },
  displayScale: { type: Number, default: 1 },
})

const emit = defineEmits(['update:images'])

const images = defineModel('images', { default: () => [] })

const fileInputRef = ref(null)
const canvasAreaRef = ref(null)
const selectedId = ref(null)

function triggerUpload () { fileInputRef.value?.click() }

function onFileChange (e) {
  const files = Array.from(e.target.files)
  e.target.value = ''
  files.forEach(file => addImage(file))
}

function onDrop (e) {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  files.forEach(file => addImage(file))
}

function addImage (file) {
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      images.value.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name: file.name.replace(/\.[^.]+$/, ''),
        data: e.target.result,
        x: 0, y: 0,
        w: img.width, h: img.height,
        origW: img.width, origH: img.height
      })
      // Auto-layout if grid mode
      if (props.mode === 'grid') applyGridLayout()
      emit('update:images', images.value)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// ── Canvas size ────────────────────────────────────
const canvasRealW = computed(() => {
  if (props.canvasWidth > 0) return props.canvasWidth
  if (!images.value.length) return 400
  return Math.max(...images.value.map(img => img.x + img.w))
})
const canvasRealH = computed(() => {
  if (props.canvasHeight > 0) return props.canvasHeight
  if (!images.value.length) return 300
  return Math.max(...images.value.map(img => img.y + img.h))
})

const canvasStyle = computed(() => ({
  width: canvasRealW.value * props.displayScale + 'px',
  height: canvasRealH.value * props.displayScale + 'px',
  background: props.bgColor === 'transparent'
    ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50%/16px 16px'
    : props.bgColor,
  position: 'relative',
  border: '1px solid var(--border)',
  overflow: 'hidden',
}))

// ── Layer styles ───────────────────────────────────
function layerStyle (img, idx) {
  const sc = props.displayScale
  return {
    position: 'absolute',
    left: img.x * sc + 'px',
    top: img.y * sc + 'px',
    width: img.w * sc + 'px',
    height: img.h * sc + 'px',
    zIndex: idx + 1,
  }
}

function selectLayer (id) { selectedId.value = id }

// ── Grid layout ────────────────────────────────────
function applyGridLayout () {
  const imgs = images.value
  if (!imgs.length) return
  const rows = props.gridRows, cols = props.gridCols, gap = props.gridGap
  // Find max cell size from images
  let maxW = 0, maxH = 0
  imgs.forEach(img => { maxW = Math.max(maxW, img.origW); maxH = Math.max(maxH, img.origH) })
  imgs.forEach((img, i) => {
    const r = Math.floor(i / cols), c = i % cols
    img.x = c * (maxW + gap)
    img.y = r * (maxH + gap)
    img.w = img.origW
    img.h = img.origH
  })
}

watch(() => [props.mode, props.gridRows, props.gridCols, props.gridGap], () => {
  if (props.mode === 'grid') applyGridLayout()
})

// ── Drag ───────────────────────────────────────────
function startDrag (e, id) {
  if (props.mode === 'grid') return // no free drag in grid mode
  e.preventDefault()
  const img = images.value.find(i => i.id === id)
  if (!img) return
  const sc = props.displayScale
  const sx = e.clientX, sy = e.clientY, ox = img.x, oy = img.y

  const onMove = (e) => {
    img.x = ox + Math.round((e.clientX - sx) / sc)
    img.y = oy + Math.round((e.clientY - sy) / sc)

    // Snap: collect candidate edges from other images
    const SNAP = 8
    const others = images.value.filter(i => i.id !== id)
    const edges = others.map(o => ({
      l: o.x, r: o.x + o.w, t: o.y, b: o.y + o.h, w: o.w, h: o.h
    }))
    // Include canvas origin as a reference edge
    edges.push({ l: 0, r: 0, t: 0, b: 0, w: 0, h: 0, origin: true })

    let bestDx = Infinity, bestDy = Infinity
    let snapX = null, snapY = null

    const tryX = (d) => { if (Math.abs(d) < Math.abs(bestDx)) { bestDx = d; snapX = d } }
    const tryY = (d) => { if (Math.abs(d) < Math.abs(bestDy)) { bestDy = d; snapY = d } }

    for (const ed of edges) {
      // Horizontal: my left → their right
      tryX(ed.r - img.x)
      // Horizontal: my right → their left
      tryX(ed.l - (img.x + img.w))
      // Same-width column snap
      if (Math.abs(img.w - ed.w) < 2) tryX(ed.l - img.x)
      if (Math.abs(img.w - ed.w) < 2) tryX(ed.r - (img.x + img.w))
      // Vertical: my top → their bottom
      tryY(ed.b - img.y)
      // Vertical: my bottom → their top
      tryY(ed.t - (img.y + img.h))
      // Same-height row snap
      if (Math.abs(img.h - ed.h) < 2) tryY(ed.t - img.y)
      if (Math.abs(img.h - ed.h) < 2) tryY(ed.b - (img.y + img.h))
    }

    if (snapX !== null && Math.abs(snapX) <= SNAP) img.x += snapX
    if (snapY !== null && Math.abs(snapY) <= SNAP) img.y += snapY
  }
  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

// ── Resize ─────────────────────────────────────────
function startResize (e, id, corner) {
  e.preventDefault()
  const img = images.value.find(i => i.id === id)
  if (!img) return
  const sc = props.displayScale
  const sx = e.clientX, sy = e.clientY
  const ox = img.x, oy = img.y, ow = img.w, oh = img.h
  const ratio = img.origW / img.origH

  const onMove = (e) => {
    const dx = Math.round((e.clientX - sx) / sc)
    const dy = Math.round((e.clientY - sy) / sc)
    let nw = ow, nh = oh, nx = ox, ny = oy

    if (corner.includes('r')) nw = Math.max(10, ow + dx)
    if (corner.includes('l')) { nw = Math.max(10, ow - dx); nx = ox + ow - nw }
    if (corner.includes('b')) nh = Math.max(10, oh + dy)
    if (corner.includes('t')) { nh = Math.max(10, oh - dy); ny = oy + oh - nh }

    // Keep aspect ratio with shift key or by default
    if (e.shiftKey) {
      nh = Math.round(nw / ratio)
    }

    img.x = nx; img.y = ny; img.w = nw; img.h = nh
  }
  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

// ── Expose for parent ──────────────────────────────
defineExpose({
  getCanvasSize: () => ({ w: canvasRealW.value, h: canvasRealH.value }),
  getImages: () => images.value,
  deleteSelected: () => {
    if (!selectedId.value) return
    images.value = images.value.filter(i => i.id !== selectedId.value)
    selectedId.value = null
  },
  clearAll: () => {
    images.value = []
    selectedId.value = null
  },
  exportPNG: async () => {
    const cw = canvasRealW.value, ch = canvasRealH.value
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d')

    // Background
    if (props.bgColor !== 'transparent') {
      ctx.fillStyle = props.bgColor
      ctx.fillRect(0, 0, cw, ch)
    }

    // Draw each image
    const loadImg = (src) => new Promise(res => {
      const img = new Image(); img.onload = () => res(img); img.src = src
    })

    for (const img of images.value) {
      const el = await loadImg(img.data)
      ctx.drawImage(el, img.x, img.y, img.w, img.h)
    }

    // Download
    const link = document.createElement('a')
    link.download = 'stitch-result.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
})
</script>

<style scoped>
.stitch-view {
  width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  position: relative;
}
.upload-zone {
  padding: 40px; border: 2px dashed var(--border);
  border-radius: 16px; text-align: center; cursor: pointer; max-width: 380px;
}
.upload-zone:hover { border-color: var(--accent); background: rgba(255,215,0,0.05); }
.upload-zone h3 { margin-bottom: 6px; }
.upload-zone p { color: var(--text2); font-size: 13px; }
.canvas-area {
  width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  overflow: auto; padding: 20px;
}
.stitch-canvas { border-radius: 2px; }

/* Layer */
.layer {
  position: absolute; cursor: move;
  outline: 2px solid transparent; transition: outline-color 0.15s;
}
.layer:hover { outline-color: rgba(255,215,0,0.3); }
.layer.selected { outline-color: var(--accent); }
.layer-body { position: absolute; inset: 0; z-index: 1; }
.layer-img { width: 100%; height: 100%; display: block; pointer-events: none; }
.layer-label {
  position: absolute; top: -18px; left: 0;
  font-size: 10px; padding: 1px 4px;
  background: var(--accent); color: #000;
  border-radius: 2px; white-space: nowrap;
  pointer-events: none; opacity: 0;
  transition: opacity 0.15s;
}
.layer.selected .layer-label { opacity: 1; }

/* Resize handles */
.rh {
  position: absolute; width: 10px; height: 10px;
  background: var(--accent); border: 1px solid #000; z-index: 10;
}
.rh.tl { top: -5px; left: -5px; cursor: nw-resize; }
.rh.tr { top: -5px; right: -5px; cursor: ne-resize; }
.rh.bl { bottom: -5px; left: -5px; cursor: sw-resize; }
.rh.br { bottom: -5px; right: -5px; cursor: se-resize; }
</style>
