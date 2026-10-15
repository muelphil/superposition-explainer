<script setup lang="ts">
import MainView from './components/MainView.vue'
import PromoView from './promo/PromoView.vue'

// Dev-branch only: `/#promo` renders the recordable LinkedIn promo stage.
const isPromo = location.hash === '#promo'
window.addEventListener('hashchange', () => location.reload())
</script>

<template>
  <PromoView v-if="isPromo" />
  <MainView v-else />
</template>
