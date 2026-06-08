import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'pixel_asm_v4'
const SAVE_DEBOUNCE = 600

let _saveTimer = null

export const useAppStore = defineStore('app', () => {
  // ── Persistent collections ─────────────────────────────
  const sets       = ref([])   // { id, name, imgData, imgW, imgH }
  const parts      = ref([])   // { id, name, catId, setId, region:{x,y,w,h} }
  const categories = ref([])   // { id, name, color, zIdx, anim, delay }
  const presets    = ref([])   // { id, name, slots:{catId:partId}, globalScale, facingLeft, animOn, animSpeed, partAdj:{catId:{ox,oy,scale,z}} }

  // ── UI state (not persisted) ─────────────────────────
  const mode         = ref('crop')      // 'crop' | 'library' | 'assemble'
  const editingSetId = ref(null)
  const regions      = ref({})          // temp crop regions for current editing set
  const activeRegionId = ref(null)
  const activePresetId = ref(null)

  // ── Live assembly state ──────────────────────────────
  const globalScale = ref(10)
  const facingLeft  = ref(true)
  const animOn      = ref(true)
  const animSpeed   = ref(1.2)
  const slots       = ref({})   // { catId: partId }
  const partAdj     = ref({})   // { catId: { ox, oy, scale, z } }

  // ── Persistence ──────────────────────────────────────
  function persist () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sets: sets.value,
        parts: parts.value,
        categories: categories.value,
        presets: presets.value
      }))
    } catch (e) {
      console.warn('Persist failed (quota?)', e)
    }
  }

  function load () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { ensureDefaultCategories(); return }
      const d = JSON.parse(raw)
      sets.value       = d.sets       || []
      parts.value      = d.parts      || []
      categories.value = d.categories || []
      presets.value    = d.presets    || []
      ensureDefaultCategories()
    } catch (e) {
      console.warn('Load failed', e)
      ensureDefaultCategories()
    }
  }

  function ensureDefaultCategories () {
    if (categories.value.length === 0) {
      categories.value = [
        { id: uid(), name: '头盔',   color: '#e06666', zIdx: 10, anim: 'head', delay: '0s'    },
        { id: uid(), name: '左肩甲', color: '#f6b26b', zIdx: 5,  anim: 'body', delay: '0.15s' },
        { id: uid(), name: '右肩甲', color: '#f6b26b', zIdx: 5,  anim: 'body', delay: '0.15s' },
        { id: uid(), name: '裤子',   color: '#93c47d', zIdx: 3,  anim: 'body', delay: '0.3s'  }
      ]
      persist()
    }
  }

  // Auto-persist on collection changes
  watch([sets, parts, categories, presets], () => {
    clearTimeout(_saveTimer)
    _saveTimer = setTimeout(persist, SAVE_DEBOUNCE)
  }, { deep: true })

  // ── Helpers ──────────────────────────────────────────
  function uid () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  }

  // ── Sets ─────────────────────────────────────────────
  function addSet (name, imgData, imgW, imgH) {
    const s = { id: uid(), name, imgData, imgW, imgH }
    sets.value.push(s)
    return s
  }
  function removeSet (id) {
    sets.value = sets.value.filter(s => s.id !== id)
    parts.value = parts.value.filter(p => p.setId !== id)
  }

  // ── Categories ───────────────────────────────────────
  function addCategory (name) {
    const colors = ['#e06666','#f6b26b','#93c47d','#6fa8dc','#d5a6bd','#c27ba0','#8e7cc3','#76a5af','#f4b400','#db4437','#0f9d58','#4285f4']
    const c = {
      id: uid(), name,
      color: colors[categories.value.length % colors.length],
      zIdx: 5, anim: 'body', delay: '0.15s'
    }
    categories.value.push(c)
    return c
  }
  function removeCategory (id) {
    categories.value = categories.value.filter(c => c.id !== id)
    parts.value.forEach(p => { if (p.catId === id) p.catId = null })
    // Remove from presets
    presets.value.forEach(pr => {
      delete pr.slots[id]
      delete pr.partAdj[id]
    })
  }
  function updateCategory (id, patch) {
    const cat = getCat(id)
    if (cat) Object.assign(cat, patch)
  }

  // ── Parts ────────────────────────────────────────────
  function addPart (name, catId, setId, region) {
    const p = { id: uid(), name, catId, setId, region: { ...region } }
    parts.value.push(p)
    return p
  }
  function removePart (id) {
    parts.value = parts.value.filter(p => p.id !== id)
    presets.value.forEach(pr => {
      Object.keys(pr.slots).forEach(k => { if (pr.slots[k] === id) pr.slots[k] = null })
    })
  }
  function updatePart (id, patch) {
    const p = parts.value.find(x => x.id === id)
    if (p) Object.assign(p, patch)
  }
  function partsByCategory (catId) {
    return parts.value.filter(p => p.catId === catId)
  }

  // ── Presets ──────────────────────────────────────────
  function addPreset (name) {
    const pr = {
      id: uid(), name,
      slots: { ...slots.value },
      globalScale: globalScale.value,
      facingLeft: facingLeft.value,
      animOn: animOn.value,
      animSpeed: animSpeed.value,
      partAdj: JSON.parse(JSON.stringify(partAdj.value))
    }
    presets.value.push(pr)
    activePresetId.value = pr.id
    persist()
    return pr
  }
  function removePreset (id) {
    presets.value = presets.value.filter(p => p.id !== id)
    if (activePresetId.value === id) activePresetId.value = null
  }
  function loadPreset (id) {
    const pr = presets.value.find(p => p.id === id)
    if (!pr) return
    activePresetId.value = id
    slots.value       = { ...pr.slots }
    globalScale.value = pr.globalScale || 10
    facingLeft.value  = pr.facingLeft ?? true
    animOn.value      = pr.animOn ?? true
    animSpeed.value   = pr.animSpeed || 1.2
    partAdj.value     = JSON.parse(JSON.stringify(pr.partAdj || {}))
    // Ensure all categories have adj entries
    categories.value.forEach(c => {
      if (!partAdj.value[c.id]) {
        partAdj.value[c.id] = { ox: 0, oy: 0, scale: 1, z: c.zIdx }
      }
    })
  }
  function saveCurrentPreset () {
    if (!activePresetId.value) return
    const pr = presets.value.find(p => p.id === activePresetId.value)
    if (!pr) return
    pr.slots       = { ...slots.value }
    pr.globalScale = globalScale.value
    pr.facingLeft  = facingLeft.value
    pr.animOn      = animOn.value
    pr.animSpeed   = animSpeed.value
    pr.partAdj     = JSON.parse(JSON.stringify(partAdj.value))
    persist()
  }

  // ── Assembly helpers ─────────────────────────────────
  function initAssembly () {
    slots.value = {}
    partAdj.value = {}
    categories.value.forEach(c => {
      slots.value[c.id] = null
      partAdj.value[c.id] = { ox: 0, oy: 0, scale: 1, z: c.zIdx }
    })
  }

  function getActiveParts () {
    return categories.value
      .map(cat => {
        const pid = slots.value[cat.id]
        if (!pid) return null
        const part = parts.value.find(p => p.id === pid)
        if (!part) return null
        const set = sets.value.find(s => s.id === part.setId)
        if (!set) return null
        return { cat, part, set, adj: partAdj.value[cat.id] || { ox: 0, oy: 0, scale: 1, z: cat.zIdx } }
      })
      .filter(Boolean)
  }

  return {
    // State
    sets, parts, categories, presets,
    mode, editingSetId, regions, activeRegionId, activePresetId,
    globalScale, facingLeft, animOn, animSpeed, slots, partAdj,
    // Persistence
    load, persist,
    // Sets
    addSet, removeSet, getSet: id => sets.value.find(s => s.id === id),
    // Categories
    addCategory, removeCategory, updateCategory, getCat: id => categories.value.find(c => c.id === id),
    // Parts
    addPart, removePart, updatePart, partsByCategory,
    getPart: id => parts.value.find(p => p.id === id),
    // Presets
    addPreset, removePreset, loadPreset, saveCurrentPreset,
    // Assembly
    initAssembly, getActiveParts
  }
})
