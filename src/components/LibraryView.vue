<template>
  <div class="library-view">
    <div v-if="store.parts.length === 0" class="empty">
      部件库为空。先去"裁切"页面上传并裁切部件。
    </div>

    <div v-for="cat in store.categories" :key="cat.id" class="cat-section">
      <div
        class="cat-hdr"
        :class="{ 'drag-over': dragOverCat === cat.id }"
        @dragover.prevent="dragOverCat = cat.id"
        @dragleave="dragOverCat = null"
        @drop="onDrop($event, cat.id)"
      >
        <span class="dot" :style="{ background: cat.color }" />
        <span class="cname">{{ cat.name }}</span>
        <span class="ccount">{{ store.partsByCategory(cat.id).length }}</span>
        <span class="cact">拖拽部件到此处</span>
      </div>

      <div
        class="lib-grid"
        @dragover.prevent="dragOverCat = cat.id"
        @drop="onDrop($event, cat.id)"
      >
        <div
          v-for="part in store.partsByCategory(cat.id)" :key="part.id"
          class="part-card"
          draggable="true"
          :class="{ dragging: dragPid === part.id }"
          @dragstart="onDragStart($event, part.id)"
          @dragend="onDragEnd"
        >
          <canvas :ref="el => setCanvas(el, part)" width="56" height="56" class="pixelated" />
          <div class="pname">{{ part.name }}</div>
          <div class="psrc">{{ store.getSet(part.setId)?.name || '' }}</div>
          <el-button
            class="del-btn" size="small" type="danger" circle
            @click.stop="onDelete(part.id)"
          >×</el-button>
        </div>
      </div>
    </div>

    <!-- Uncategorized -->
    <div v-if="uncategorized.length" class="cat-section">
      <div class="cat-hdr" :class="{ 'drag-over': dragOverCat === 'none' }"
        @dragover.prevent="dragOverCat = 'none'" @dragleave="dragOverCat = null"
        @drop="onDrop($event, null)">
        <span class="dot" style="background:#666" />
        <span class="cname">未分类</span>
        <span class="ccount">{{ uncategorized.length }}</span>
      </div>
      <div class="lib-grid" @dragover.prevent @drop="onDrop($event, null)">
        <div v-for="part in uncategorized" :key="part.id"
          class="part-card" draggable="true"
          @dragstart="onDragStart($event, part.id)" @dragend="onDragEnd">
          <canvas :ref="el => setCanvas(el, part)" width="56" height="56" class="pixelated" />
          <div class="pname">{{ part.name }}</div>
          <el-button class="del-btn" size="small" type="danger" circle @click.stop="onDelete(part.id)">×</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { ElMessageBox } from 'element-plus'

const store = useAppStore()
const dragPid     = ref(null)
const dragOverCat = ref(null)

const uncategorized = computed(() =>
  store.parts.filter(p => !p.catId || !store.getCat(p.catId))
)

// Render part thumbnails
watch(() => store.parts.length, () => {
  nextTick(() => renderAllThumbs())
}, { immediate: true })

function setCanvas (el, part) {
  if (!el) return
  renderThumb(el, part)
}

function renderThumb (cvs, part) {
  const set = store.getSet(part.setId)
  if (!set) return
  const img = new Image()
  img.onload = () => {
    const ctx = cvs.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const r = part.region
    const sc = Math.min(56 / r.w, 56 / r.h)
    ctx.drawImage(img, r.x, r.y, r.w, r.h, (56 - r.w * sc) / 2, (56 - r.h * sc) / 2, r.w * sc, r.h * sc)
  }
  img.src = set.imgData
}

function renderAllThumbs () {
  // handled per-canvas via setCanvas ref
}

// Drag & Drop
function onDragStart (e, pid) {
  dragPid.value = pid
  e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd () {
  dragPid.value = null
  dragOverCat.value = null
}
function onDrop (e, catId) {
  e.preventDefault()
  dragOverCat.value = null
  if (!dragPid.value) return
  const part = store.getPart(dragPid.value)
  if (part) {
    store.updatePart(part.id, { catId })
    store.persist()
  }
  dragPid.value = null
}

async function onDelete (pid) {
  try {
    await ElMessageBox.confirm('删除此部件？', '确认', { type: 'warning' })
    store.removePart(pid)
    store.persist()
  } catch {}
}
</script>

<style scoped>
.library-view { padding: 20px 24px; overflow-y: auto; height: 100%; }
.empty { color: var(--text2); text-align: center; padding: 60px 20px; font-size: 13px; }
.cat-section { margin-bottom: 20px; }
.cat-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: rgba(255,255,255,0.03);
  border-radius: 8px; margin-bottom: 8px;
  transition: 0.2s;
}
.cat-hdr.drag-over { outline: 2px solid var(--accent); }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.cname { font-size: 13px; font-weight: 600; flex: 1; }
.ccount { font-size: 11px; color: var(--text2); }
.cact { font-size: 10px; color: var(--text2); opacity: 0; transition: 0.2s; }
.cat-hdr:hover .cact { opacity: 1; }
.lib-grid { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 4px; }
.part-card {
  width: 88px; padding: 6px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  border-radius: 8px; text-align: center;
  cursor: grab; transition: 0.2s; position: relative;
}
.part-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
.part-card.dragging { opacity: 0.4; }
.part-card canvas { border-radius: 4px; background: rgba(255,255,255,0.02); }
.pname { font-size: 10px; margin-top: 3px; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.psrc { font-size: 9px; color: var(--text2); opacity: 0.6; }
.del-btn {
  position: absolute; top: 2px; right: 2px;
  width: 20px !important; height: 20px !important;
  display: none;
}
.part-card:hover .del-btn { display: flex; }
</style>
