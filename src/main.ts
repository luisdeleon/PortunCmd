import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
const app = createApp(App)

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')

// Hide loader after Vue mounts
if (typeof document !== 'undefined') {
  // Use nextTick to ensure Vue has rendered
  setTimeout(() => {
    const loadingBg = document.getElementById('loading-bg')
    const loading = document.querySelector('.loading')
    if (loadingBg) {
      loadingBg.style.display = 'none'
    }
    if (loading) {
      (loading as HTMLElement).style.display = 'none'
    }
  }, 100)
}
