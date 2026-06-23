import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { setInterval as setIntervalFn } from 'timers'

dotenv.config()

const app = express()

// CORS configuration
const isDev = process.env.NODE_ENV !== 'production'
const corsOptions = isDev 
  ? {} // Dev: allow all origins
  : {
      origin: ['https://seaofbeer.com', 'http://seaofbeer.com'],
      credentials: true,
      optionsSuccessStatus: 200
    }
app.use(cors(corsOptions))
app.use(express.json())

const PORT = process.env.PORT || 3000
const LOG_DIR = path.join(process.cwd(), 'server', 'logs')
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
const DATA_DIR = path.join(process.cwd(), 'server', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const SELECTED_FILE = path.join(DATA_DIR, 'selected.json')
const EMAIL_API_BASE = process.env.EMAIL_API_BASE || 'https://localhost:7079'
const EMAIL_API_SEND_PATH = process.env.EMAIL_API_SEND_PATH || '/api/Events/create'
const EMAIL_API_ALLOW_SELF_SIGNED = (process.env.EMAIL_API_ALLOW_SELF_SIGNED || 'true') === 'true'

if (EMAIL_API_ALLOW_SELF_SIGNED && EMAIL_API_BASE.startsWith('https://localhost')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') || fallback
  } catch (e) {
    return fallback
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2))
}

async function sendEmailViaApi({ organizer, subject, message, recipients }) {
  if (!organizer || !subject || !message || !Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('organizer, subject, message and recipients[] required')
  }

  const response = await fetch(`${EMAIL_API_BASE}${EMAIL_API_SEND_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizer, subject, message, recipients }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`Email API request failed (${response.status}): ${err || response.statusText}`)
  }
}

async function createEventViaApi() {
  const response = await fetch(`${EMAIL_API_BASE}${EMAIL_API_SEND_PATH}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`Email API request failed (${response.status}): ${err || response.statusText}`)
  }

  return response.json().catch(() => ({ ok: true }))
}

// Serve static files from dist folder (Vue frontend)
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use(express.static(path.join(__dirname, '../dist')))

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/rsvp')) {
    return next()
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.post('/api/events/create', async (req, res) => {
  try {
    const result = await createEventViaApi()
    res.json({ ok: true, result })
  } catch (e) {
    console.error('events.create proxy failed', e)
    res.status(500).json({ error: String(e) })
  }
})

function writeLog(file, obj) {
  try {
    const p = path.join(LOG_DIR, file)
    fs.appendFileSync(p, JSON.stringify(obj) + '\n')
  } catch (e) {
    console.error('log write failed', e)
  }
}

function genToken(email) {
  return Buffer.from(`${Date.now()}|${email}|${Math.random().toString(36).slice(2,9)}`).toString('base64url')
}

app.post('/api/send', async (req, res) => {
  try {
    const { organizer, subject, message, recipients } = req.body
    if (!organizer || !subject || !message || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'organizer, subject, message and recipients[] required' })
    }

    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`

    const sendId = `send_${Date.now()}`
    const sendRecord = { sendId, organizer, subject, message, createdAt: new Date().toISOString(), recipients: [] }

    // Send individualized emails with RSVP links
    for (const r of recipients) {
      const token = genToken(r)
      const yesLink = `${publicUrl}/rsvp/${token}/yes`
      const noLink = `${publicUrl}/rsvp/${token}/no`

      const personalizedMessage = `${message}\n\nYes: ${yesLink}\nNo: ${noLink}`

      // record mapping
      sendRecord.recipients.push({ email: r, token })

      // forward to external email API
      await sendEmailViaApi({
        organizer,
        subject,
        message: personalizedMessage,
        recipients: [r],
      })
    }

    writeLog('sends.log', sendRecord)
    return res.json({ ok: true, sendId })
  } catch (err) {
    console.error('send error', err)
    return res.status(500).json({ error: String(err) })
  }
})

// Scheduling API
app.get('/api/schedule', (req, res) => {
  const s = readJson(SETTINGS_FILE, null)
  res.json({ schedule: s })
})

app.post('/api/schedule', (req, res) => {
  const { day, time, minYesPercent = 75, waitHours = 48, minYesCount = 4 } = req.body
  if (typeof day !== 'number' || typeof time !== 'string') {
    return res.status(400).json({ error: 'day (0-6) and time (HH:MM) required' })
  }
  const settings = { day, time, minYesPercent, waitHours, minYesCount, lastRun: null }
  writeJson(SETTINGS_FILE, settings)
  res.json({ ok: true, settings })
})

// manual trigger: accepts optional recipients array
app.post('/api/schedule/trigger', async (req, res) => {
  try {
    const { recipients } = req.body || {}
    // build recipients list
    let list = []
    if (Array.isArray(recipients) && recipients.length) list = recipients
    else {
      // try server data people.json
      const peopleFile = path.join(DATA_DIR, 'people.json')
      if (fs.existsSync(peopleFile)) {
        const p = JSON.parse(fs.readFileSync(peopleFile, 'utf8'))
        list = p.map(x => x.email)
      } else {
        // fallback to public/people.txt
        const txt = path.join(process.cwd(), 'public', 'people.txt')
        if (fs.existsSync(txt)) {
          const lines = fs.readFileSync(txt, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
          list = lines.map(l => l.split(',').map(s => s.trim())[1]).filter(Boolean)
        }
      }
    }

    if (!list.length) return res.status(400).json({ error: 'No recipients found' })

    // reuse send logic by calling internal function
    const sendId = await doSend({ organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local', subject: 'Scheduled send', message: 'Weekly scheduled send', recipients: list })
    res.json({ ok: true, sendId })
  } catch (e) {
    console.error('trigger error', e)
    res.status(500).json({ error: String(e) })
  }
})

// People sync endpoints (so frontend can keep server list up-to-date)
app.get('/api/people', (req, res) => {
  const peopleFile = path.join(DATA_DIR, 'people.json')
  const people = readJson(peopleFile, [])
  res.json({ people })
})

app.post('/api/people', (req, res) => {
  const { people } = req.body || {}
  if (!Array.isArray(people)) return res.status(400).json({ error: 'people[] required' })
  const peopleFile = path.join(DATA_DIR, 'people.json')
  writeJson(peopleFile, people)
  res.json({ ok: true })
})

// return latest selection / history
app.get('/api/selection/latest', (req, res) => {
  const sel = readJson(SELECTED_FILE, { chosen: [] })
  // read last selection log entry if exists
  const selections = readLogJson('selection.log')
  const last = selections.length ? selections[selections.length - 1] : null
  res.json({ selected: sel, last })
})

// notify current winner (manual)
app.post('/api/selection/notify', async (req, res) => {
  try {
    const sel = readJson(SELECTED_FILE, { chosen: [] })
    const winner = (sel.chosen && sel.chosen[sel.chosen.length - 1]) || null
    if (!winner) return res.status(400).json({ error: 'no winner available' })
    await sendEmailViaApi({
      organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local',
      subject: `You're the Beer captain!`,
      message: `Congratulations — you were chosen as Beer captain. Please choose a place to go and reply to the organizer.`,
      recipients: [winner],
    })
    res.json({ ok: true, winner })
  } catch (e) {
    console.error('notify winner manual failed', e)
    res.status(500).json({ error: String(e) })
  }
})

// Winner selects a place: persist choice and notify yes-responders
app.post('/api/selection/place', async (req, res) => {
  try {
    const { placeId } = req.body || {}
    if (!placeId) return res.status(400).json({ error: 'placeId required' })
    const places = readJson(PLACES_FILE, [])
    const place = places.find(p => p.id === placeId)
    if (!place) return res.status(404).json({ error: 'place not found' })

    // persist selected place with attempt tracking and lock after 3 confirms
    const selected = readJson(SELECTED_FILE, { chosen: [] })
    const currentWinner = (selected.chosen && selected.chosen.length) ? selected.chosen[selected.chosen.length - 1] : null
    if (!currentWinner) return res.status(400).json({ error: 'no current winner to select place' })

    selected.placeAttempts = selected.placeAttempts || {}
    const prevAttempts = Number(selected.placeAttempts[currentWinner] || 0)
    const MAX_ATTEMPTS = 3
    if (prevAttempts >= MAX_ATTEMPTS) {
      return res.status(403).json({ error: 'place selection locked', locked: true, attempts: prevAttempts })
    }

    const newAttempts = prevAttempts + 1
    selected.placeAttempts[currentWinner] = newAttempts
    selected.place = place
    writeJson(SELECTED_FILE, selected)
    writeLog('selection.log', { action: 'place_selected', place, winner: currentWinner, attempts: newAttempts, ts: new Date().toISOString() })

    // collect yes responders (merge sends + rsvps)
    const sends = readLogJson('sends.log')
    const tokenToEmail = new Map()
    for (const s of sends) {
      if (s && Array.isArray(s.recipients)) {
        for (const r of s.recipients) {
          if (r && r.token && r.email) tokenToEmail.set(r.token, r.email)
        }
      }
    }
    const rsvps = readLogJson('rsvps.log')
    const yesEmailsSet = new Set()
    for (const r of rsvps) {
      if (String(r.choice).toLowerCase() !== 'yes') continue
      const email = tokenToEmail.get(r.token)
      if (email) yesEmailsSet.add(email)
    }
    const yesEmails = Array.from(yesEmailsSet)

    // send notification email to yes responders
    const placeLink = place.map || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
    if (yesEmails.length) {
      await sendEmailViaApi({
        organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local',
        subject: `Beer captain chose: ${place.name}`,
        message: `The Beer captain has chosen: ${place.name} - ${place.address} - ${placeLink}`,
        recipients: yesEmails,
      })
    }

    res.json({ ok: true, notified: yesEmails.length, place })
  } catch (e) {
    console.error('selection.place failed', e)
    res.status(500).json({ error: String(e) })
  }
})

app.get('/rsvp/:token/:choice', (req, res) => {
  try {
    const { token, choice } = req.params
    const rec = { token, choice, ts: new Date().toISOString(), ip: req.ip }
    writeLog('rsvps.log', rec)
    res.setHeader('Content-Type', 'text/html')
    res.send(`<html><body><h1>Thanks — you replied: ${escapeHtml(choice)}</h1></body></html>`)
  } catch (e) {
    res.status(500).send('Error')
  }
})

// expose RSVPs merged with sends mapping
app.get('/api/rsvps', (req, res) => {
  try {
    const sends = readLogJson('sends.log')
    const tokenToEmail = new Map()
    for (const s of sends) {
      if (s && Array.isArray(s.recipients)) {
        for (const r of s.recipients) {
          if (r && r.token && r.email) tokenToEmail.set(r.token, r.email)
        }
      }
    }
    const rsvps = readLogJson('rsvps.log')
    // map latest rsvp per token
    const byEmail = new Map()
    for (const r of rsvps) {
      const email = tokenToEmail.get(r.token) || null
      const ts = new Date(r.ts || new Date().toISOString()).getTime()
      if (!email) continue
      const prev = byEmail.get(email)
      if (!prev || (new Date(prev.ts).getTime() < ts)) {
        byEmail.set(email, { email, choice: r.choice, ts: r.ts })
      }
    }
    const out = Array.from(byEmail.values())
    res.json({ rsvps: out })
  } catch (e) {
    console.error('rsvps api error', e)
    res.status(500).json({ error: String(e) })
  }
})

// ----- Test helpers (dev only) -----
// create a fake send record (does not send email) for testing
app.post('/api/_test/send-fake', (req, res) => {
  try {
    const { recipients } = req.body || {}
    if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ error: 'recipients[] required' })
    const sendId = `send_${Date.now()}`
    const sendRecord = { sendId, organizer: process.env.SENDER_EMAIL || 'test@local', subject: 'Fake send', message: 'Fake test send', createdAt: new Date().toISOString(), recipients: [] }
    for (const r of recipients) {
      const token = genToken(r)
      sendRecord.recipients.push({ email: r, token })
    }
    writeLog('sends.log', sendRecord)
    return res.json({ ok: true, sendId, sendRecord })
  } catch (e) {
    console.error('send-fake failed', e)
    res.status(500).json({ error: String(e) })
  }
})

// force choose winner for a given sendId by reading logs and invoking chooseWinner
app.post('/api/_test/choose/:sendId', (req, res) => {
  try {
    const { sendId } = req.params
    const sends = readLogJson('sends.log')
    const sendRecord = sends.find(s => s && s.sendId === sendId)
    if (!sendRecord) return res.status(404).json({ error: 'sendId not found' })
    // build yes token set from rsvps.log
    const rsvps = readLogJson('rsvps.log')
    const recipientTokens = new Set((sendRecord.recipients || []).map(r => r.token))
    const yesSet = new Set()
    for (const r of rsvps) {
      if (!r || !r.token) continue
      if (!recipientTokens.has(r.token)) continue
      if (String(r.choice).toLowerCase() === 'yes') yesSet.add(r.token)
    }
    chooseWinner(sendRecord, yesSet)
    res.json({ ok: true, notified: yesSet.size })
  } catch (e) {
    console.error('choose test failed', e)
    res.status(500).json({ error: String(e) })
  }
})

// Places endpoints
const PLACES_FILE = path.join(DATA_DIR, 'places.json')

function normalizeAdminPlaces(rawList) {
  return (Array.isArray(rawList) ? rawList : []).map((item, index) => {
    const parsedId = Number(item?.placeId ?? item?.id)
    const placeId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : index + 1
    const link = String(item?.link ?? item?.map ?? '')
    return {
      placeId,
      name: String(item?.name ?? ''),
      address: String(item?.address ?? ''),
      link,
      // keep legacy fields so existing flows that expect id/map continue working
      id: String(item?.id ?? placeId),
      map: link,
    }
  })
}

app.get('/api/admin/Places', (req, res) => {
  const normalized = normalizeAdminPlaces(readJson(PLACES_FILE, []))
  writeJson(PLACES_FILE, normalized)
  res.json(normalized.map(({ placeId, name, address, link }) => ({ placeId, name, address, link })))
})

app.post('/api/admin/Places/add', (req, res) => {
  const { name, address, link = '' } = req.body || {}
  if (!name || !address) return res.status(400).json({ error: 'name and address required' })

  const normalized = normalizeAdminPlaces(readJson(PLACES_FILE, []))
  const nextId = normalized.length ? Math.max(...normalized.map((p) => Number(p.placeId) || 0)) + 1 : 1
  const item = {
    placeId: nextId,
    name: String(name),
    address: String(address),
    link: String(link || ''),
    id: String(nextId),
    map: String(link || ''),
  }

  normalized.push(item)
  writeJson(PLACES_FILE, normalized)
  res.json({ ok: true, place: { placeId: item.placeId, name: item.name, address: item.address, link: item.link } })
})

app.put('/api/admin/Places/:id', (req, res) => {
  const idParam = String(req.params.id)
  const { name, address, link = '' } = req.body || {}
  if (!name || !address) return res.status(400).json({ error: 'name and address required' })

  const normalized = normalizeAdminPlaces(readJson(PLACES_FILE, []))
  const idx = normalized.findIndex((p) => String(p.placeId) === idParam || String(p.id) === idParam)
  if (idx === -1) return res.status(404).json({ error: 'not found' })

  const updated = {
    ...normalized[idx],
    name: String(name),
    address: String(address),
    link: String(link || ''),
    map: String(link || ''),
  }
  normalized[idx] = updated

  writeJson(PLACES_FILE, normalized)
  res.json({ ok: true, place: { placeId: updated.placeId, name: updated.name, address: updated.address, link: updated.link } })
})

app.get('/api/places', (req, res) => {
  const list = readJson(PLACES_FILE, [])
  res.json({ places: list })
})

app.post('/api/places', (req, res) => {
  const { name, address, map } = req.body || {}
  if (!name || !address) return res.status(400).json({ error: 'name and address required' })
  const list = readJson(PLACES_FILE, [])
  const id = `place_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
  const item = { id, name, address, map: map || '' }
  list.push(item)
  writeJson(PLACES_FILE, list)
  res.json({ ok: true, place: item })
})

app.delete('/api/places/:id', (req, res) => {
  const id = req.params.id
  let list = readJson(PLACES_FILE, [])
  const before = list.length
  list = list.filter(p => p.id !== id)
  if (list.length === before) return res.status(404).json({ error: 'not found' })
  writeJson(PLACES_FILE, list)
  res.json({ ok: true })
})

// --- Scheduling runtime ---
async function doSend({ organizer, subject, message, recipients }) {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`
  const sendId = `send_${Date.now()}`
  const sendRecord = { sendId, organizer, subject, message, createdAt: new Date().toISOString(), recipients: [] }
  for (const r of recipients) {
    const token = genToken(r)
    const yesLink = `${publicUrl}/rsvp/${token}/yes`
    const noLink = `${publicUrl}/rsvp/${token}/no`
    const personalizedMessage = `${message}\n\nYes: ${yesLink}\nNo: ${noLink}`
    sendRecord.recipients.push({ email: r, token })
    await sendEmailViaApi({ organizer, subject, message: personalizedMessage, recipients: [r] })
  }
  writeLog('sends.log', sendRecord)
  // start monitoring responses for this send
  monitorResponses(sendRecord)
  return sendId
}

function readLogJson(file) {
  const p = path.join(LOG_DIR, file)
  if (!fs.existsSync(p)) return []
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l) } catch (e) { return null }
  }).filter(Boolean)
}

async function monitorResponses(sendRecord) {
  const { sendId, recipients } = sendRecord
  // Read settings but enforce a 1 hour wait and require more than 3 yes responses
  const settings = readJson(SETTINGS_FILE, null) || { minYesPercent: 75, waitHours: 48, minYesCount: 4 }
  const minYes = Number(settings.minYesPercent || 75)
  const minYesCount = Number(settings.minYesCount || 4)
  const waitHours = Number(settings.waitHours || 1)
  const deadline = Date.now() + (waitHours * 3600 * 1000)

  const recipientTokens = new Set(recipients.map(r => r.token))

    const check = () => {
    const rsvps = readLogJson('rsvps.log')
    const relevant = rsvps.filter(r => recipientTokens.has(r.token))
    const total = recipients.length
    const yesSet = new Set(relevant.filter(r => String(r.choice).toLowerCase() === 'yes').map(r => r.token))
    const yesCount = yesSet.size
    const percent = Math.round((yesCount / total) * 100)
    // Require configured minYesCount and minYesPercent to select a winner.
    if (yesCount >= minYesCount && percent >= minYes) {
      chooseWinner(sendRecord, yesSet)
      return true
    }
    if (Date.now() > deadline) {
      // deadline reached: only choose if we meet the minYesCount
      if (yesCount >= minYesCount) {
        chooseWinner(sendRecord, yesSet)
      } else {
        writeLog('selection.log', { sendId, winner: null, reason: 'insufficient_yes', yesCount, ts: new Date().toISOString() })
      }
      return true
    }
    return false
  }

  // poll every 60s until condition met
  const id = setIntervalFn(() => {
    try {
      const done = check()
      if (done) clearInterval(id)
    } catch (e) {
      console.error('monitor error', e)
    }
  }, 60 * 1000)
}

function chooseWinner(sendRecord, yesTokenSet) {
  try {
    const tokenToEmail = new Map(sendRecord.recipients.map(r => [r.token, r.email]))
    const yesEmails = Array.from(yesTokenSet).map(t => tokenToEmail.get(t)).filter(Boolean)
    if (!yesEmails.length) {
      writeLog('selection.log', { sendId: sendRecord.sendId, winner: null, reason: 'no_yes', ts: new Date().toISOString() })
      return
    }
    // load selected history
    const selected = readJson(SELECTED_FILE, { chosen: [] })
    const already = new Set(selected.chosen)
    const candidates = yesEmails.filter(e => !already.has(e))
    let winner = null
    if (candidates.length === 0) {
      // reset history
      selected.chosen = []
      writeJson(SELECTED_FILE, selected)
      winner = yesEmails[Math.floor(Math.random() * yesEmails.length)]
    } else {
      winner = candidates[Math.floor(Math.random() * candidates.length)]
    }
    // persist winner
    selected.chosen.push(winner)
    // clear any previously selected place so the new winner must pick manually
    if (selected.place) delete selected.place
    writeJson(SELECTED_FILE, selected)
    writeLog('selection.log', { sendId: sendRecord.sendId, winner, ts: new Date().toISOString() })

    // notify organizer and winner through external email API
    sendEmailViaApi({
      organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local',
      subject: `Winner selected for ${sendRecord.sendId}`,
      message: `Winner: ${winner}`,
      recipients: [sendRecord.organizer],
    }).catch(e => console.error('notify organizer failed', e))

    sendEmailViaApi({
      organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local',
      subject: `You're the Beer captain!`,
      message: `Congratulations — you were chosen as Beer captain for ${sendRecord.sendId}. Please choose a place to go and reply to the organizer: ${sendRecord.organizer}`,
      recipients: [winner],
    }).catch(e => console.error('notify winner failed', e))
  } catch (e) {
    console.error('chooseWinner error', e)
  }
}

// start background scheduler that checks every minute
function startScheduler() {
  const settings = readJson(SETTINGS_FILE, null)
  if (!settings) return
  setIntervalFn(() => {
    try {
      const s = readJson(SETTINGS_FILE, null)
      if (!s) return
      const now = new Date()
      const day = now.getDay()
      const hhmm = now.toTimeString().slice(0,5)
      if (s.day === day && s.time === hhmm) {
        // prevent double run within same minute
        if (s.lastRun === hhmm && s.lastRunDate === now.toISOString().slice(0,10)) return
        // update lastRun
        s.lastRun = hhmm
        s.lastRunDate = now.toISOString().slice(0,10)
        writeJson(SETTINGS_FILE, s)
        // trigger send using server people if available
        (async () => {
          try {
            await doSend({ organizer: process.env.SENDER_EMAIL || 'organizer@seaofbeer.local', subject: 'Scheduled Weekly Send', message: 'Weekly send', recipients: (readJson(path.join(DATA_DIR, 'people.json'), []) || []).map(p => p.email) })
          } catch (e) { console.error('scheduled send failed', e) }
        })()
      }
    } catch (e) {
      console.error('scheduler error', e)
    }
  }, 60 * 1000)
}

startScheduler()

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
