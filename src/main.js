import { Buffer } from 'buffer'
window.Buffer = Buffer

window.process = {
  env: {},
}
import './assets/main.css'
import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"

const pinia = createPinia()

createApp(App)
  .use(pinia)  
  .mount("#app")
