<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
    defineProps<{
      colorTop: string
      colorBottom: string
      circleSize?: number
      barWidth?: number
    }>(),
    {
      circleSize: 10,
      barWidth: 4,
    },
)

const gradientStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${props.colorTop},
    ${props.colorBottom}
  )`,
}))
</script>

<template>
  <div
      class="dim-legend"
      :style="{
      '--circle-size': `${circleSize}px`,
      '--circle-radius': `${circleSize / 2}px`,
      '--bar-width': `${barWidth}px`,
    }"
  >
    <!-- Left column -->
    <div class="scale">
      <div class="gradient" :style="gradientStyle" />

      <div
          class="circle circle-top"
          :style="{ backgroundColor: colorTop }"
      />

      <div
          class="circle circle-bottom"
          :style="{ backgroundColor: colorBottom }"
      />
    </div>

    <!-- Right column -->
    <div class="label label-top">
      <span v-katex="'d=15'" />
    </div>

    <div class="dots">
      <span v-katex="'\\vdots'" />
    </div>

    <div class="label label-bottom">
      <span v-katex="'d=3'" />
    </div>
  </div>
</template>

<style scoped>
.dim-legend {
  position: relative;
  font-size: 0.9em;
  display: grid;
  grid-template-columns: var(--circle-size) auto;
  grid-template-rows:
    var(--circle-size)
    minmax(22px, 1fr)
    var(--circle-size);

  column-gap: 8px;
  row-gap: 0;

  align-items: center;

  padding: 8px 10px;

  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;

  box-sizing: border-box;
  width: fit-content;

  pointer-events: none;
}

/* ---------- Scale ---------- */

.scale {
  position: relative;

  grid-column: 1;
  grid-row: 1 / 4;

  width: var(--circle-size);
  height: 100%;
}

.gradient {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: calc(2 * var(--circle-radius));
  transform: translateX(-50%);
  border-radius: 999px;
  z-index: 0;
}

.circle {
  position: absolute;

  left: 50%;

  width: var(--circle-size);
  height: var(--circle-size);

  transform: translateX(-50%);

  border-radius: 50%;

  border: 1px solid rgba(0, 0, 0, 0.35);

  box-sizing: border-box;

  z-index: 1;
}

.circle-top {
  top: 0;
}

.circle-bottom {
  bottom: 0;
}

/* ---------- Labels ---------- */

.label {
  display: flex;
  align-items: center;
  line-height: 1;
}

.label-top {
  grid-column: 2;
  grid-row: 1;
}

.label-bottom {
  grid-column: 2;
  grid-row: 3;
}

.dots {
  grid-column: 2;
  grid-row: 2;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- KaTeX ---------- */

.label :deep(.katex),
.dots :deep(.katex) {
  font-size: inherit;
  line-height: 1;
  margin: 0;
}

.dots :deep(.katex) {
  opacity: 0.75;
}
</style>