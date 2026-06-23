<template>
  <section class="panel selector-panel">
    <h2 style="color:#003B4F">Random Picker</h2>
    <div style="display:flex;gap:8px;align-items:center">
      <q-btn @click="$emit('pick')" class="pick-btn" label="Pick random person" />
      <q-btn @click="$emit('clear')" class="clear-btn" label="Clear picks" flat />
    </div>

    <h3 style="margin-top:12px; color:#003B4F">Selected ({{ selectedPeople.length }}/{{ people.length }})</h3>
    <ul class="people-list selected-list">
      <li v-for="(p,i) in selectedPeople" :key="p.email" class="person selected">
        <div>
          <div class="person-name">{{ p.name }}</div>
          <div class="person-email">{{ p.email }}</div>
        </div>
        <div class="selected-order">#{{ i + 1 }}</div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
type Person = { name: string; email: string }
const props = defineProps<{ people: Person[]; selectedEmails: string[] }>()
const emit = defineEmits<{ (e: 'pick'|'clear'): void }>()

const selectedPeople = computed(() => props.selectedEmails.map(e => props.people.find(p => p.email === e)).filter(Boolean) as Person[])
</script>

<style scoped>
.selected-list .person { display:flex; justify-content:space-between; align-items:center }
</style>
