<template>
  <section class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="color:#003B4F;margin:0;font-size:22px">Crew Members</h3>
      <div style="display:flex;align-items:center;gap:8px">
        <q-btn @click="openAddForm" icon="add" label="Add new" flat class="add-member-btn" title="Add member" />
      </div>
    </div>

    <form v-if="showForm" @submit.prevent="submit()" class="admin-form" style="border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 16px;">
      <div style="font-weight:700;color:#003B4F;margin-bottom:8px">Add crew member</div>
      <label>
        Name
        <input ref="nameRef" v-model="name" placeholder="Enter crew member name" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <label>
        Email
        <input ref="emailRef" v-model="email" placeholder="Enter email" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <div style="display:flex; justify-content:flex-end; margin-top:4px;">
        <label style="display:inline-flex !important; align-items:center; gap:2px; margin:0; font-size:14px; line-height:1; white-space:nowrap;">
          <input type="checkbox" v-model="active" style="margin:0; padding:0; vertical-align:middle;" />
          <span style="margin-left:0">Active</span>
        </label>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button type="submit" style="padding: 8px 12px; background-color: #1F3A5F; color: white; border: 0; border-radius: 6px; cursor: pointer; font-weight: 500;">Add crew member</button>
        <button type="button" @click="cancelEdit()" style="padding: 8px 12px; background-color: transparent; color: #666; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">Cancel</button>
      </div>
    </form>

    <ul style="list-style:none;padding:0;margin-top:12px">
      <li v-for="(p,i) in displayPeople" :key="i" class="panel" style="margin-bottom:8px">
        <div class="member-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div class="member-meta">
            <div class="member-name" :style="{ fontWeight: 700, color: p.active === false ? '#999' : 'inherit', textDecoration: p.active === false ? 'line-through' : 'none', fontSize: '22px' }">{{ p.name }}</div>
          </div>
          <div class="member-actions" style="display:flex;gap:8px;align-items:center">
            <button
              type="button"
              class="status-toggle"
              :class="p.active === false ? 'inactive' : 'active'"
              @click="toggleActive(p)"
              :title="p.active === false ? 'Set active' : 'Set inactive'"
            >
              <span class="status-mark" :class="p.active === false ? 'inactive-mark' : 'active-mark'">{{ p.active === false ? '✕' : '✓' }}</span>
            </button>
            <q-btn @click="removePerson(p)" icon="delete_outline" flat dense />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

type Person = { userId?: number; name: string; email: string; active?: boolean }

const props = defineProps<{ onAddPerson: (p:Person)=>void; onEditPerson?: (userId:number|null|undefined, p:Person)=>void; existing?: Person[]; showNotification: (m:string,t?:'error'|'success'|'info')=>void; onDeletePerson: (email:string)=>void; selectedEmails?: string[] }>()

const name = ref('')
const email = ref('')
const active = ref(true)
const showForm = ref(false)
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
  props.onAddPerson({ name: name.value.trim(), email: email.value.trim(), active: active.value })
  name.value = ''
  email.value = ''
  active.value = true
  showForm.value = false
  props.showNotification('Person added', 'success')
}

function openAddForm() {
  if (showForm.value) {
    cancelEdit()
    return
  }

  name.value = ''
  email.value = ''
  active.value = true
  showForm.value = true

  nextTick(() => {
    if (emailRef.value) {
      emailRef.value.focus()
      const value = email.value || ''
      emailRef.value.setSelectionRange?.(0, value.length)
    }
  })
}

async function toggleActive(p: Person) {
  if (!props.onEditPerson) return
  const selectedPerson = (props.existing || []).find((item) => {
    if (item.userId != null && p.userId != null) return item.userId === p.userId
    return Boolean(item.email && p.email && item.email === p.email)
  }) || p

  const nextActive = selectedPerson.active !== false
  try {
    await props.onEditPerson?.(selectedPerson.userId ?? null, {
      userId: selectedPerson.userId ?? undefined,
      name: selectedPerson.name,
      email: selectedPerson.email,
      active: !nextActive,
    })
    props.showNotification(nextActive ? 'Crew member marked inactive' : 'Crew member marked active', 'success')
  } catch (e) {
    props.showNotification('Failed to update active status', 'error')
  }
}

function cancelEdit() {
  name.value = ''
  email.value = ''
  active.value = true
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

.status-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  padding: 0;
  border: 1px solid #003B4F;
  border-radius: 4px;
  background: transparent;
  color: #003B4F;
  cursor: pointer;
  font-size: 17px;
  font-weight: 800;
}

.status-toggle.active {
  color: #21ba45;
  border-color: #003B4F;
  background: transparent;
}

.status-toggle.inactive {
  color: #8B0000;
  border-color: #003B4F;
  background: transparent;
}

.status-mark {
  line-height: 1;
  font-size: 24px;
  display: inline-block;
  text-shadow: 0 0 1px rgba(0, 0, 0, 0.15);
}

.active-mark {
  font-weight: 1500;
}

.inactive-mark {
  font-weight: 1500;
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
