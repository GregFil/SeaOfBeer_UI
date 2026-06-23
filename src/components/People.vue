<template>
  <section class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="color:#003B4F;margin:0">Crew Members</h3>
      <q-btn @click="showForm = !showForm" icon="add" label="Add new" flat class="add-member-btn" title="Add member" />
    </div>

    <form v-if="showForm" @submit.prevent="editingEmail ? saveEdit() : submit()" class="admin-form" style="border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 16px;">
      <label>
        Name
        <input ref="nameRef" v-model="name" placeholder="Enter crew member name" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <label>
        Email
        <input ref="emailRef" v-model="email" placeholder="Enter email" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button type="submit" style="padding: 8px 12px; background-color: #1F3A5F; color: white; border: 0; border-radius: 6px; cursor: pointer; font-weight: 500;">{{ editingEmail ? 'Save changes' : 'Add crew member' }}</button>
        <button type="button" @click="cancelEdit()" style="padding: 8px 12px; background-color: transparent; color: #666; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">Cancel</button>
      </div>
    </form>

    <ul style="list-style:none;padding:0;margin-top:12px">
      <li v-for="(p,i) in displayPeople" :key="i" class="panel" style="margin-bottom:8px">
        <div class="member-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div class="member-meta">
            <div class="member-name" style="font-weight:700">{{ p.name }}</div>
            <a class="member-email" :href="`mailto:${p.email}`" style="color:var(--muted);text-decoration:none">{{ p.email }}</a>
          </div>
          <div class="member-actions" style="display:flex;gap:8px;align-items:center">
            <q-btn @click="startEdit(p)" icon="edit" flat dense style="color:#003B4F; border: 1px solid #003B4F; border-radius: 4px;" />
            <q-btn @click="removePerson(p)" icon="delete_outline" flat dense />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

type Person = { name: string; email: string }

const props = defineProps<{ onAddPerson: (p:Person)=>void; onEditPerson?: (oldEmail:string, p:Person)=>void; existing?: Person[]; showNotification: (m:string,t?:'error'|'success'|'info')=>void; onDeletePerson: (email:string)=>void; selectedEmails?: string[] }>()

const name = ref('')
const email = ref('')
const showForm = ref(false)
const editingEmail = ref<string | null>(null)
const nameRef = ref<HTMLInputElement|null>(null)
const emailRef = ref<HTMLInputElement|null>(null)

const selectedEmails = computed(() => props.selectedEmails || [])

// Show only selected items if available, otherwise show all
const displayPeople = computed(() => {
  const existingPeople = props.existing || []
  if (selectedEmails.value.length === 0) return existingPeople
  return existingPeople.filter(p => selectedEmails.value.includes(p.email))
})

let mounted = true

onMounted(() => {
  mounted = true
})

onUnmounted(() => {
  mounted = false
})

function submit() {
  if (!name.value.trim() || !email.value.trim()) {
    props.showNotification('Name and email are required', 'error')
    if (!name.value.trim()) nameRef.value?.focus()
    else emailRef.value?.focus()
    return
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  if (!emailValid) {
    props.showNotification('Please enter a valid email address', 'error')
    emailRef.value?.focus()
    return
  }
  props.onAddPerson({ name: name.value.trim(), email: email.value.trim() })
  name.value = ''
  email.value = ''
  showForm.value = false
  props.showNotification('Person added', 'success')
}

function startEdit(p: Person) {
  editingEmail.value = p.email
  name.value = p.name
  email.value = p.email
  showForm.value = true
}

function saveEdit() {
  if (!name.value.trim() || !email.value.trim()) {
    props.showNotification('Name and email are required', 'error')
    if (!name.value.trim()) nameRef.value?.focus()
    else emailRef.value?.focus()
    return
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  if (!emailValid) {
    props.showNotification('Please enter a valid email address', 'error')
    emailRef.value?.focus()
    return
  }
  if (props.onEditPerson) {
    props.onEditPerson(editingEmail.value as string, { name: name.value.trim(), email: email.value.trim() })
    cancelEdit()
    props.showNotification('Crew member updated', 'success')
  }
}

function cancelEdit() {
  editingEmail.value = null
  name.value = ''
  email.value = ''
  showForm.value = false
}

function removePerson(p: Person) {
  if (confirm(`Delete ${p.name} <${p.email}>?`)) {
    try { props.onDeletePerson(p.email) } catch (e) {}
    props.showNotification('Person removed', 'success')
  }
}
</script>

<style scoped>
.panel {
  background: linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)), url('/banner.png');
  background-position: center;
  background-repeat: no-repeat;
  background-size: calc(100% - 4px) calc(100% - 4px);
}

.admin-form label { display:block; margin-bottom:8px }
.add-member-btn { color: #003B4F; font-size: 1.1em; font-family: 'Pirata One', cursive; font-weight: 700; }

.member-row {
  flex-wrap: nowrap;
}

.member-meta {
  min-width: 0;
  flex: 1;
}

.member-name,
.member-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-actions {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .member-row {
    display: flex !important;
    align-items: center;
    gap: 6px;
  }

  .member-actions {
    margin-left: auto;
  }
}
</style>
