import { createApp } from 'vue'
import './style.css'
import 'katex/dist/katex.min.css'
import App from './App.vue'
import Vue3Katex from 'vue3-katex'

createApp(App)
  .use(Vue3Katex, { katexOptions: { throwOnError: false } })
  .mount('#app')
