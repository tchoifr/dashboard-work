import { Buffer } from 'buffer'
window.Buffer = Buffer

window.process = {
  env: {},
}
import './assets/main.css'
import './assets/wallet-adapter.css'
import { createApp } from "vue"
import { createPinia } from "pinia"
import { WalletReadyState } from "@solana/wallet-adapter-base"
import { initWallet } from "@solana/wallet-adapter-vue"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import App from "./App.vue"

const pinia = createPinia()
const phantom = new PhantomWalletAdapter()

if (typeof phantom.ready !== "function") {
  phantom.ready = async () => {
    const state = phantom.readyState
    return state === WalletReadyState.Installed || state === WalletReadyState.Loadable
  }
}

initWallet({
  wallets: [
    {
      adapter: phantom,
      name: phantom.name,
      url: phantom.url,
      icon: phantom.icon,
      readyState: phantom.readyState,
    },
  ],
  autoConnect: false,
  onError: (error) => {
    console.error("[wallet-adapter]", error)
  },
})

createApp(App)
  .use(pinia)  
  .mount("#app")
