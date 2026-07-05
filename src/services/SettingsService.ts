import { ref, computed, watch } from 'vue'

// Module-level singleton — import directly, no inject/provide needed.

/** Whether the purple input-point sphere is visible in the Embedding Space view. */
export const showEmbeddingPoint = ref(true)

/** Whether IO neurons use feature color gradient instead of blue → orange. */
export const useFeatureColorsForIO = ref(true)

/** Whether hovering a neuron dims the other neurons and their input values (default: off). */
export const dimNeuronsOnHover = ref(true)

/** Theme mode: 'system' | 'dark' | 'light' — persisted in localStorage. */
const STORAGE_KEY = 'app-theme-mode'

const saved = localStorage.getItem(STORAGE_KEY)
export const themeMode = ref(
  (saved as 'system' | 'dark' | 'light' | null) || 'system'
)

/** Browser `prefers-color-scheme: dark` state. */
let prefersDark = false
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  prefersDark = mql.matches
  mql.addEventListener('change', (e) => {
    prefersDark = e.matches
    applyTheme()
  })
}

/** Whether the UI is currently in dark mode (effective, after system resolution). */
export const isDark = computed(() => {
  if (themeMode.value === 'system') return prefersDark
  return themeMode.value === 'dark'
})

/** Apply the resolved theme to the `<html>` element. */
export function applyTheme(): void {
  const html = document.documentElement
  if (isDark.value) {
    html.setAttribute('data-theme', 'dark')
    document.documentElement.classList.add('dark-mode')
  } else {
    html.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark-mode')
  }
}

// Persist and apply on change
watch(themeMode, () => {
  localStorage.setItem(STORAGE_KEY, themeMode.value)
  applyTheme()
})

// Apply on initial load
applyTheme()
