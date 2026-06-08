<template>
  <el-dialog v-model="visible" :title="'选择 ' + catName" width="600px" destroy-on-close>
    <div v-if="!parts.length" class="empty">此分类下暂无部件</div>
    <div v-else class="modal-grid">
      <div
        v-for="part in parts" :key="part.id"
        class="modal-part"
        @click="onSelect(part.id)"
      >
        <canvas :ref="el => renderThumb(el, part)" width="52" height="52" class="pixelated" />
        <div class="mp-name">{{ part.name }}</div>
        <div class="mp-src">{{ store.getSet(part.setId)?.name || '' }}</div>
      </div>
    </div>

    <template #footer>
      <el-button v-if="store.slots[catId]" type="danger" size="small" @click="onClear">清除此部件</el-button>
      <el-button @click="visible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const visible = ref(false)
const catId = ref(null)

const catName = computed(() => store.getCat(catId.value)?.name || '')
const parts = computed(() => catId.value ? store.partsByCategory(catId.value) : [])

function open (id) {
  catId.value = id
  visible.value = true
}

function onSelect (partId) {
  store.slots[catId.value] = partId
  store.saveCurrentPreset()
  visible.value = false
}

function onClear () {
  store.slots[catId.value] = null
  store.saveCurrentPreset()
  visible.value = false
}

function renderThumb (el, part) {
  if (!el) return
  const set = store.getSet(part.setId)
  if (!set) return
  const img = new Image()
  img.onload = () => {
    const ctx = el.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const r = part.region
    const sc = Math.min(52 / r.w, 52 / r.h)
    ctx.drawImage(img, r.x, r.y, r.w, r.h, (52 - r.w * sc) / 2, (52 - r.h * sc) / 2, r.w * sc, r.h * sc)
  }
  img.src = set.imgData
}

// Listen for open event
function onOpenEvent (e) { open(e.detail.catId) }
onMounted(() => window.addEventListener('open-part-picker', onOpenEvent))
onUnmounted(() => window.removeEventListener('open-part-picker', onOpenEvent))
</script>

<style scoped>
.empty { text-align: center; color: var(--text2); padding: 30px; }
.modal-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.modal-part {
  width: 84px; padding: 6px;
  background: rgba(255,255,255,0.03); border: 2px solid transparent;
  border-radius: 8px; text-align: center; cursor: pointer; transition: 0.2s;
}
.modal-part:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
.modal-part canvas { border-radius: 4px; background: rgba(255,255,255,0.02); }
.mp-name { font-size: 10px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-src { font-size: 9px; color: var(--text2); }
</style>
