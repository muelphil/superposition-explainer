<script setup lang="ts">
import MainView from './components/MainView.vue'
import PromoView from './promo/PromoView.vue'
import RecordingControls from './promo/RecordingControls.vue'

// Dev-branch only: `/#promo` renders the recordable LinkedIn promo stage.
// Reload only when switching into or out of it, so in-article anchor links keep working.
const isPromo = location.hash === '#promo'
window.addEventListener('hashchange', () => {
  if ((location.hash === '#promo') !== isPromo) location.reload()
})
</script>

<template>
  <PromoView v-if="isPromo" />
  <template v-else>
    <MainView />
    <!-- Numpad-driven recording tooling for the narrated workshop video -->
    <RecordingControls />
  </template>
</template>
