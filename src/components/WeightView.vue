<script setup lang="ts">
import { inject, computed } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import type { SelectionServiceType, SelectionTarget } from '../services/SelectionService'
import { valColorRgb } from '../utils/featureColor'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

const m = computed(() => svc.config.embeddingDim)
const n = computed(() => svc.config.inputDim)

// ─── KaTeX expressions (plain LaTeX strings, rendered via v-katex) ────────────
const eqEncoder = 'y = Wx'
const eqDecoder = '\\hat{x} = \\operatorname{ReLU}(W^{\\!\\top}y + b)'
const titleW    = 'W'
const titleB    = 'b^{\\top}'
const titleNorm = '\\|w_i\\|'

function fmtNorm(v: number): string { return v.toFixed(2) }

// ─── Illumination ─────────────────────────────────────────────────────────────
interface WvIllum {
  wRows: Set<number> | 'all'
  wCols: Set<number> | 'all'
  wCell: { r: number; c: number } | null
  bCols: Set<number> | 'all'
}

function illumForTarget(t: SelectionTarget): WvIllum | null {
  if (!t) return null
  switch (t.kind) {
    case 'feature':
    case 'input':
    case 'output':
      return { wRows: 'all', wCols: new Set([t.idx]), wCell: null, bCols: new Set([t.idx]) }
    case 'emb':
      return { wRows: new Set([t.idx]), wCols: 'all', wCell: null, bCols: new Set() }
    case 'bias':
    case 'relu':
      return { wRows: new Set(), wCols: new Set(), wCell: null, bCols: new Set([t.idx]) }
    case 'weight':
      return { wRows: new Set(), wCols: new Set(), wCell: { r: t.row, c: t.col }, bCols: new Set() }
    default:
      return null
  }
}

const activeIllum = computed<WvIllum | null>(() => {
  const hov = selSvc.hovered.value
  if (hov) return illumForTarget(hov)
  return null
})

function isActive(): boolean { return activeIllum.value !== null }

function inSet(s: Set<number> | 'all', idx: number): boolean {
  return s === 'all' || (s as Set<number>).has(idx)
}

function cellHighlighted(r: number, c: number): boolean {
  const illum = activeIllum.value
  if (!illum) return false
  if (illum.wCell) return illum.wCell.r === r && illum.wCell.c === c
  return inSet(illum.wRows, r) && inSet(illum.wCols, c)
}

function biasHighlighted(c: number): boolean {
  const illum = activeIllum.value
  if (!illum) return false
  return inSet(illum.bCols, c)
}

function colHeaderHighlighted(c: number): boolean {
  const illum = activeIllum.value
  if (!illum) return false
  if (illum.wCell) return illum.wCell.c === c
  if (illum.wCols === 'all') return true
  return (illum.wCols as Set<number>).has(c)
}

function rowHeaderHighlighted(r: number): boolean {
  const illum = activeIllum.value
  if (!illum) return false
  if (illum.wCell) return illum.wCell.r === r
  if (illum.wRows === 'all') return true
  return (illum.wRows as Set<number>).has(r)
}

function clearHover() { selSvc.clearHover() }

// ─── Hover / click wrappers ───────────────────────────────────────────────────
function onColEnter(c: number) { selSvc.setHover({ kind: 'feature', idx: c }, 'weights') }
function onRowEnter(r: number) { selSvc.setHover({ kind: 'emb', idx: r }, 'weights') }
function onCellEnter(r: number, c: number) { selSvc.setHover({ kind: 'weight', row: r, col: c }, 'weights') }
function onBiasEnter(c: number) { selSvc.setHover({ kind: 'bias', idx: c }, 'weights') }

// ─── Color / value helpers ────────────────────────────────────────────────────

function fmt(v: number): string {
  const s = v.toFixed(2)
  return v >= 0 ? `\u200b${s}` : s
}

function wVal(r: number, c: number): number { return svc.W.value[r]?.[c] ?? 0 }
function bVal(c: number): number             { return svc.b.value[c] ?? 0 }

function featureVecLength(c: number): number {
  let sum = 0
  for (let k = 0; k < m.value; k++) {
    const w = svc.W.value[k]?.[c] ?? 0
    sum += w * w
  }
  return Math.sqrt(sum)
}
</script>

<template>
  <div class="wv-root" @mouseleave="clearHover">

    <!-- ══ Equations reference bar ══════════════════════════════ -->
    <div class="eq-bar">
      <span class="eq-item" v-katex="eqEncoder" />
      <span class="eq-item" v-katex="eqDecoder" />
    </div>

    <!-- ══ Weight matrix W ══════════════════════════════════════ -->
    <div class="matrix-section">
      <div class="matrix-title" v-katex="titleW" />

      <div class="matrix-layout">
        <!-- Column headers -->
        <div class="col-headers-row">
          <div class="corner" />
          <div class="col-header-spacer" />
          <div
            v-for="c in n" :key="c"
            class="col-header"
            :class="{
              highlighted: colHeaderHighlighted(c - 1),
              dimmed:      isActive() && !colHeaderHighlighted(c - 1),
            }"
            @mouseenter="onColEnter(c - 1)"
            @mouseleave="clearHover"
            v-katex="`w_{${c}}`"
          />
          <div class="col-header-spacer" />
        </div>

        <!-- Matrix body: row-labels | [ | cells | ] -->
        <div class="matrix-body-row">
          <div class="row-labels">
            <div
              v-for="r in m" :key="r"
              class="row-header"
              :class="{
                highlighted: rowHeaderHighlighted(r - 1),
                dimmed:      isActive() && !rowHeaderHighlighted(r - 1),
              }"
              @mouseenter="onRowEnter(r - 1)"
              @mouseleave="clearHover"
              v-katex="`h_{${r}}`"
            />
          </div>
          <div class="bracket bracket-left" />
          <div class="cell-grid" :style="{ gridTemplateColumns: `repeat(${n}, 1fr)` }">
            <template v-for="r in m" :key="r">
              <div
                v-for="c in n" :key="`${r}-${c}`"
                class="matrix-cell"
                :class="{
                  highlighted: cellHighlighted(r - 1, c - 1),
                  dimmed:      isActive() && !cellHighlighted(r - 1, c - 1),
                }"
                :style="{ background: valColorRgb(wVal(r - 1, c - 1)) }"
                @mouseenter="onCellEnter(r - 1, c - 1)"
                @mouseleave="clearHover"
              >
                <span class="cell-val">{{ fmt(wVal(r - 1, c - 1)) }}</span>
              </div>
            </template>
          </div>
          <div class="bracket bracket-right" />
        </div>

        <!-- ‖w_i‖ norm row -->
        <div class="norm-row">
          <div class="norm-row-label" v-katex="titleNorm" />
          <div class="bracket-spacer" />
          <div class="cell-grid norm-grid" :style="{ gridTemplateColumns: `repeat(${n}, 1fr)` }">
            <div
              v-for="c in n" :key="c"
              class="norm-cell"
              :class="{
                highlighted: colHeaderHighlighted(c - 1),
                dimmed:      isActive() && !colHeaderHighlighted(c - 1),
              }"
            >{{ fmtNorm(featureVecLength(c - 1)) }}</div>
          </div>
          <div class="bracket-spacer" />
        </div>
      </div>
    </div>

    <!-- ══ Bias vector b ════════════════════════════════════════ -->
    <div class="matrix-section">
      <div class="matrix-title" v-katex="titleB" />

      <div class="matrix-layout">
        <div class="matrix-body-row">
          <div class="row-labels">
            <div class="row-header row-header-ghost" />
          </div>
          <div class="bracket bracket-left" />
          <div class="cell-grid" :style="{ gridTemplateColumns: `repeat(${n}, 1fr)` }">
            <div
              v-for="c in n" :key="c"
              class="matrix-cell"
              :class="{
                highlighted: biasHighlighted(c - 1),
                dimmed:      isActive() && !biasHighlighted(c - 1),
              }"
              :style="{ background: valColorRgb(bVal(c - 1)) }"
              @mouseenter="onBiasEnter(c - 1)"
              @mouseleave="clearHover"
            >
              <span class="cell-val">{{ fmt(bVal(c - 1)) }}</span>
            </div>
          </div>
          <div class="bracket bracket-right" />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.wv-root {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
  width: 100%;
  padding: 0.1rem 0.15rem;
  box-sizing: border-box;
}

/* ══ Equation reference bar ══════════════════════════════════════ */
.eq-bar {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.3rem 0.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 100%;
  box-sizing: border-box;
}

.eq-item :deep(.katex) {
  font-size: 0.8rem;
  color: var(--color-text-primary);
}

/* ══ Matrix section ══════════════════════════════════════════════ */
.matrix-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.matrix-title {
  padding-left: 2.1rem; /* aligns above the cells, past corner + bracket */
  line-height: 1;
}

.matrix-title :deep(.katex) {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

/* ══ Layout ══════════════════════════════════════════════════════ */
.matrix-layout {
  display: flex;
  flex-direction: column;
}

.col-headers-row {
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.1rem;
  gap: 1.5px;
}

.corner {
  width: 1.75rem;
  flex-shrink: 0;
}

.col-header-spacer {
  width: 6px;
  flex-shrink: 0;
}

/* ══ Column headers ══════════════════════════════════════════════ */
.col-header {
  min-width: 2.75rem;
  text-align: center;
  cursor: pointer;
  border-radius: 3px 3px 0 0;
  transition: opacity 0.15s;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-header :deep(.katex) {
  font-size: 0.75rem;
  color: var(--color-text-label);
  transition: color 0.15s;
}

.col-header.highlighted :deep(.katex) {
  color: var(--color-text-primary);
  font-weight: 700;
}

.col-header.dimmed {
  opacity: 0.3;
}

/* ══ Matrix body ═════════════════════════════════════════════════ */
.matrix-body-row {
  display: flex;
  align-items: stretch;
}

/* ══ Row labels ══════════════════════════════════════════════════ */
.row-labels {
  display: flex;
  flex-direction: column;
  width: 1.75rem;
  flex-shrink: 0;
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.25rem;
  cursor: pointer;
  border-radius: 3px 0 0 3px;
  transition: opacity 0.15s;
  user-select: none;
  min-height: 1.75rem;
}

.row-header :deep(.katex) {
  font-size: 0.75rem;
  color: var(--color-text-label);
  transition: color 0.15s;
}

.row-header.highlighted :deep(.katex) {
  color: var(--color-text-primary);
  font-weight: 700;
}

.row-header.dimmed {
  opacity: 0.3;
}

.row-header-ghost {
  pointer-events: none;
  min-height: 1.75rem;
}

/* ══ Brackets ════════════════════════════════════════════════════ */
.bracket {
  width: 6px;
  flex-shrink: 0;
  border-top: 1.5px solid var(--color-text-label);
  border-bottom: 1.5px solid var(--color-text-label);
}

.bracket-left {
  border-left: 1.5px solid var(--color-text-label);
  border-radius: 2px 0 0 2px;
}

.bracket-right {
  border-right: 1.5px solid var(--color-text-label);
  border-radius: 0 2px 2px 0;
}

/* ══ Cell grid ═══════════════════════════════════════════════════ */
.cell-grid {
  display: grid;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

/* ══ Individual cell ═════════════════════════════════════════════ */
.matrix-cell {
  min-width: 2.75rem;
  min-height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  cursor: pointer;
  transition: opacity 0.15s;
  border: 1px solid transparent;
}

.matrix-cell.highlighted {
  border-color: var(--color-text-secondary);
  box-shadow: var(--shadow-ring-subtle);
}

.matrix-cell.dimmed {
  opacity: 0.3;
}

.cell-val {
  font-size: 0.65rem;
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* ══ Norm row ‖w_i‖ ══════════════════════════════════════════════ */
.norm-row {
  display: flex;
  align-items: center;
  margin-top: 0.15rem;
}

.norm-row-label {
  width: 1.75rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.25rem;
}

.norm-row-label :deep(.katex) {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
}

.bracket-spacer {
  width: 6px;
  flex-shrink: 0;
}

.norm-grid {
  background: none;
  border: none;
  padding: 0;
  gap: 2px;
}

.norm-cell {
  min-width: 2.75rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  letter-spacing: -0.02em;
  border-radius: 2px;
  transition: opacity 0.15s;
}

.norm-cell.highlighted {
  color: var(--color-text-primary);
}

.norm-cell.dimmed {
  opacity: 0.3;
}
</style>
