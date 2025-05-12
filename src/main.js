import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import debounce from 'lodash/debounce'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:5050'
axios.defaults.withCredentials = true  // ← 一定要加

// 然后再 createApp...

const RawResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends RawResizeObserver {
  constructor(cb) {
    // 防抖 20ms，避免循环回调
    super(debounce(cb, 5));
  }
};

createApp(App).use(router).use(ElementPlus).mount('#app')