<template>
  <div v-if="visible" :class="[`notify`, `notify-${type}`]" role="status" aria-live="polite">
    {{ message }}
    <q-btn class="notify-close" @click="onClose" icon="close" flat dense size="sm" aria-label="Close" />
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
const props = defineProps<{ message: string; type?: 'error'|'success'|'info'; visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

let timer: any = null
function onClose() { emit('close') }

watch(() => props.visible, (v) => {
  if (timer) { clearTimeout(timer); timer = null }
  if (v) timer = setTimeout(() => emit('close'), 3000)
})

onUnmounted(() => { if (timer) clearTimeout(timer) })
</script>

<style scoped>
.notify { position: fixed; bottom: 12px; right: 12px; padding: 8px 12px; border-radius: 4px }
.notify-success { background: #d4edda }
.notify-error { background: #f8d7da }
.notify-info { background: #d1ecf1 }
.notify-close { margin-left: 8px }
</style>
