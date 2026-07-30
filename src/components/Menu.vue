<template>
  <div :class="['menu-backdrop', open ? 'open' : '']" @click="emit('close')"></div>
  <nav :class="['app-menu', open ? 'open' : '']" :aria-hidden="!open">
    <ul style="color:#003B4F; margin-left: auto;">
      <li><a :href="homeHref">Quarterdeck</a></li>
      <li><a :href="crewHref">Crew</a></li>
      <li><a :href="covesHref">Coves</a></li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; homeHref?: string; crewHref?: string; covesHref?: string }>(), {
  homeHref: '#/',
  crewHref: '#/crew',
  covesHref: '#/coves',
})
const emit = defineEmits<{ close: [] }>()
</script>
