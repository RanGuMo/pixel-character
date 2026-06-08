<template>
  <div class="assembly-view">
    <div class="char-wrap">
      <div
        class="character-container"
        :style="containerStyle"
      >
        <div class="ground-shadow" />
        <div
          v-for="ap in activeParts" :key="ap.cat.id"
          class="part-wrapper"
          :class="animClass(ap.cat)"
          :style="wrapperStyle(ap)"
        >
          <div
            class="part-inner pixelated"
            :style="innerStyle(ap)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const activeParts = computed(() => store.getActiveParts())

const containerStyle = computed(() => {
  const parts = activeParts.value
  if (!parts.length) return { width: '200px', height: '100px' }
  const gs = store.globalScale
  let bL = Infinity, bT = Infinity, bR = -Infinity, bB = -Infinity
  parts.forEach(({ part }) => {
    const r = part.region
    bL = Math.min(bL, r.x); bT = Math.min(bT, r.y)
    bR = Math.max(bR, r.x + r.w); bB = Math.max(bB, r.y + r.h)
  })
  return {
    width:  (bR - bL) * gs + 'px',
    height: (bB - bT) * gs + 'px',
    transform: store.facingLeft ? 'scaleX(-1)' : 'scaleX(1)'
  }
})

function wrapperStyle ({ cat, part, set, adj }) {
  const gs = store.globalScale
  const r  = part.region
  const activeParts = store.getActiveParts()
  let bL = Infinity, bT = Infinity
  activeParts.forEach(({ part: p }) => {
    bL = Math.min(bL, p.region.x); bT = Math.min(bT, p.region.y)
  })
  const cx = (r.x + r.w / 2 - bL) * gs
  const cy = (r.y + r.h / 2 - bT) * gs
  const dw = r.w * gs, dh = r.h * gs
  return {
    left: cx + 'px', top: cy + 'px',
    width: dw + 'px', height: dh + 'px',
    marginLeft: -dw / 2 + 'px', marginTop: -dh / 2 + 'px',
    zIndex: adj.z,
    '--anim-speed': store.animSpeed + 's',
    '--anim-delay': cat.delay
  }
}

function innerStyle ({ part, set, adj }) {
  const gs = store.globalScale
  const r  = part.region
  return {
    width: r.w * gs + 'px',
    height: r.h * gs + 'px',
    backgroundImage: `url(${set.imgData})`,
    backgroundSize: `${set.imgW * gs}px ${set.imgH * gs}px`,
    backgroundPosition: `${-r.x * gs}px ${-r.y * gs}px`,
    '--ox': adj.ox + 'px',
    '--oy': adj.oy + 'px',
    '--s': adj.scale
  }
}

function animClass (cat) {
  if (!store.animOn) return {}
  return cat.anim === 'head' ? 'anim-head' : 'anim-body'
}
</script>

<style scoped>
.assembly-view { width: 100%; height: 100%; }
.char-wrap {
  width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
}
.character-container { position: relative; }
.ground-shadow {
  position: absolute; bottom: -15px; left: 50%;
  transform: translateX(-50%);
  width: 55%; height: 30px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%);
  border-radius: 50%;
}
.part-wrapper { position: absolute; pointer-events: none; }
.part-inner {
  position: absolute; top: 0; left: 0;
  background-repeat: no-repeat;
  transform: translate(-50%, -50%)
             translate(var(--ox, 0px), var(--oy, 0px))
             scale(var(--s, 1));
}
</style>
