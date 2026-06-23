import { createApp } from 'vue'
import { Quasar } from 'quasar'
import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import App from './App.vue'
import './index.css'
import './App.css'

const app = createApp(App)

app.use(Quasar, {
  config: {},
  plugins: {},
})

app.mount('#root')
