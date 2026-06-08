<template>
  <div
    ref="wrapRef"
    class="sprite-wrap"
    @drop.prevent="onDrop"
    @dragover.prevent
  >
    <img
      ref="imgRef"
      :src="set.imgData"
      :style="{ width: dispW + 'px', height: dispH + 'px' }"
      class="pixelated"
      draggable="false"
    />
    <!-- Crop Rectangles -->
    <div
      v-for="reg in regionList"
      :key="reg.id"
      class="crop-rect"
      :class="{ active: reg.id === store.activeRegionId }"
      :style="rectStyle(reg)"
    >
      <div class="lbl" :style="{ background: reg.color }">{{ reg.label }}</div>
      <div class="body" @pointerdown="startDrag($event, reg.id, 'move')" />
      <div v-for="h in handles" :key="h"
        class="rh" :class="h"
        :style="{ background: reg.color }"
        @pointerdown.stop="startDrag($event, reg.id, h)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const wrapRef = ref(null)
const imgRef  = ref(null)
const dispScale = ref(1)

const set = computed(() => store.getSet(store.editingSetId))

const dispW = computed(() => set.value ? Math.round(set.value.imgW * dispScale.value) : 0)
const dispH = computed(() => set.value ? Math.round(set.value.imgH * dispScale.value) : 0)

const regionList = computed(() => Object.values(store.regions))

const handles = ['tl','tr','bl','br','tm','bm','ml','mr']

onMounted(() => { recalcScale() })
watch(() => store.editingSetId, () => { setTimeout(recalcScale, 50) })

function recalcScale () {
  if (!set.value || !wrapRef.value) return
  const parent = wrapRef.value.parentElement
  if (!parent) return
  const maxW = parent.clientWidth - 40
  const maxH = parent.clientHeight - 80
  dispScale.value = Math.min(maxW / set.value.imgW, maxH / set.value.imgH, 10)
}

function rectStyle (reg) {
  const sc = dispScale.value
  return {
    left:   reg.x * sc + 'px',
    top:    reg.y * sc + 'px',
    width:  reg.w * sc + 'px',
    height: reg.h * sc + 'px',
    borderColor: reg.color
  }
}

// ── Drag ──────────────────────────────────────────────
function startDrag (e, regId, mode) {
  e.preventDefault()
  store.activeRegionId = regId
  const s   = set.value
  const reg = store.regions[regId]
  const sc  = dispScale.value
  const sx  = e.clientX, sy = e.clientY
  const ox  = reg.x, oy = reg.y, ow = reg.w, oh = reg.h
  const M   = 4

  const onMove = (e) => {
    const dx = Math.round((e.clientX - sx) / sc)
    const dy = Math.round((e.clientY - sy) / sc)

    if (mode === 'move') {
      reg.x = clamp(ox + dx, 0, s.imgW - reg.w)
      reg.y = clamp(oy + dy, 0, s.imgH - reg.h)
    } else {
      let nx = ox, ny = oy, nw = ow, nh = oh
      if (mode.includes('l')) { nx = clamp(ox+dx, 0, ox+ow-M); nw = ow - (nx-ox) }
      if (mode.includes('r')) { nw = clamp(ow+dx, M, s.imgW-ox) }
      if (mode.includes('t')) { ny = clamp(oy+dy, 0, oy+oh-M); nh = oh - (ny-oy) }
      if (mode.includes('b')) { nh = clamp(oh+dy, M, s.imgH-oy) }
      reg.x = nx; reg.y = ny; reg.w = nw; reg.h = nh
    }
    // Force reactivity
    store.regions[regId] = { ...reg }
  }

  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

function clamp (v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function onDrop (e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    // Emit to parent for handling
    // (handled in App.vue via upload trigger)
  }
}
</script>

<style scoped>
.sprite-wrap {
  position: relative;
  display: inline-block;
  border: 2px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  cursor: crosshair;
}
.sprite-wrap img {
  display: block;
  pointer-events: none;
}
.crop-rect {
  position: absolute;
  border: 2px solid;
  z-index: 2;
  transition: box-shadow 0.12s;
}
.crop-rect.active {
  box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.4);
  z-index: 3;
}
.crop-rect:hover {
  outline: 1px dashed rgba(255, 255, 255, 0.3);
}
.lbl {
  position: absolute;
  top: -20px;
  left: -2px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
  font-weight: 600;
  color: #000;
  pointer-events: none;
}
.body {
  position: absolute;
  inset: 0;
  cursor: move;
}
.rh {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(0, 0, 0, 0.5);
  z-index: 4;
}
.rh.tl { top: -6px; left: -6px; cursor: nw-resize; }
.rh.tr { top: -6px; right: -6px; cursor: ne-resize; }
.rh.bl { bottom: -6px; left: -6px; cursor: sw-resize; }
.rh.br { bottom: -6px; right: -6px; cursor: se-resize; }
.rh.tm { top: -6px; left: 50%; margin-left: -6px; cursor: n-resize; }
.rh.bm { bottom: -6px; left: 50%; margin-left: -6px; cursor: s-resize; }
.rh.ml { top: 50%; margin-top: -6px; left: -6px; cursor: w-resize; }
.rh.mr { top: 50%; margin-top: -6px; right: -6px; cursor: e-resize; }
</style>
