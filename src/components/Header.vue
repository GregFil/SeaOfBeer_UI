<template>
  <header class="app-header">
    <div class="brand">
      <img class="brand-avatar" src="/boat.png" alt="Sea of Beer" />
      <span class="brand-title">Sea of Beer</span>
    </div>
    <q-btn icon="anchor" @click="$emit('toggle')" flat dense class="menu-toggle" aria-label="Toggle menu" />
  </header>
</template>

<script setup lang="ts">
defineEmits(['toggle'])
</script>
