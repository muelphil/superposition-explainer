<script setup lang="ts">
import { inject, computed } from 'vue'
import katex from 'katex'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import type { SelectionServiceType, SelectionTarget } from '../services/SelectionService'
import { valColorRgb } from '../utils/featureColor'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

const m = computed(() => svc.config.embeddingDim)
const n = computed(() => svc.config.inputDim)

// ─── KaTeX helper ──────────────────────────────────────────────────────────
function kx(formula: string): string {
  return katex.renderToString(formula, { throwOnError: false, output: 'html' })
}

// Static rendered strings (do not depend on reactive state)
const eqEncoder = kx('\\boldsymbol{h} = \\boldsymbol{W}\\boldsymbol{x}')
const eqDecoder = kx('\\hat{\\boldsymbol{x}} = \\operatorname{ReLU}(\\boldsymbol{W}^{\\!\\top}\\boldsymbol{h} + \\boldsymbol{b})')
const titleW    = kx('\\boldsymbol{W}')
const titleB    = kx('\\boldsymbol{b}^{\\top}')

// Per-index labels (called in template loop)
function colLabel(c: number) { return kx(`f_{${c + 1}}`) }
function rowLabel(r: number) { return kx(`h_{${r + 1}}`) }

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
  const sel = selSvc.selected.value
  if (sel) return illumForTarget(sel)
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

// ─── Selection indicators ─────────────────────────────────────────────────────
function isColSelected(c: number): boolean {
  const sel = selSvc.selected.value
  if (!sel) return false
  return (sel.kind === 'feature' || sel.kind === 'input' || sel.kind === 'output') && sel.idx === c
}

function isRowSelected(r: number): boolean {
  const sel = selSvc.selected.value
  if (!sel) return false
  return sel.kind === 'emb' && sel.idx === r
}

function isCellSelected(r: number, c: number): boolean {
  const sel = selSvc.selected.value
  if (!sel) return false
  return sel.kind === 'weight' && sel.row === r && sel.col === c
}

function isBiasSelected(c: number): boolean {
  const sel = selSvc.selected.value
  if (!sel) return false
  return sel.kind === 'bias' && sel.idx === c
}

function clearHover() { selSvc.clearHover() }

// ─── Hover / click wrappers ───────────────────────────────────────────────────
function onColEnter(c: number) { selSvc.setHover({ kind: 'feature', idx: c }, 'weights') }
function onColClick(c: number) { selSvc.setSelected({ kind: 'feature', idx: c }, 'weights') }
function onRowEnter(r: number) { selSvc.setHover({ kind: 'emb', idx: r }, 'weights') }
function onRowClick(r: number) { selSvc.setSelected({ kind: 'emb', idx: r }, 'weights') }
function onCellEnter(r: number, c: number) { selSvc.setHover({ kind: 'weight', row: r, col: c }, 'weights') }
function onCellClick(r: number, c: number) { selSvc.setSelected({ kind: 'weight', row: r, col: c }, 'weights') }
function onBiasEnter(c: number) { selSvc.setHover({ kind: 'bias', idx: c }, 'weights') }
function onBiasClick(c: number) { selSvc.setSelected({ kind: 'bias', idx: c }, 'weights') }

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
      <span class="eq-item" v-html="eqEncoder" />
      <span class="eq-sep" />
      <span class="eq-item" v-html="eqDecoder" />
    </div>

    <!-- ══ Weight matrix W ══════════════════════════════════════ -->
    <div class="matrix-section">
      <div class="matrix-title" v-html="titleW" />

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
              selected:    isColSelected(c - 1),
            }"
            :title="`f_${c}  ‖v‖ = ${featureVecLength(c - 1).toFixed(3)}`"
            @mouseenter="onColEnter(c - 1)"
            @mouseleave="clearHover"
            @click="onColClick(c - 1)"
            v-html="colLabel(c - 1)"
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
                selected:    isRowSelected(r - 1),
              }"
              @mouseenter="onRowEnter(r - 1)"
              @mouseleave="clearHover"
              @click="onRowClick(r - 1)"
              v-html="rowLabel(r - 1)"
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
                  selected:    isCellSelected(r - 1, c - 1),
                }"
                :style="{ background: valColorRgb(wVal(r - 1, c - 1)) }"
                @mouseenter="onCellEnter(r - 1, c - 1)"
                @mouseleave="clearHover"
                @click="onCellClick(r - 1, c - 1)"
              >
                <span class="cell-val">{{ fmt(wVal(r - 1, c - 1)) }}</span>
              </div>
            </template>
          </div>
          <div class="bracket bracket-right" />
        </div>
      </div>
    </div>

    <!-- ══ Bias vector b ════════════════════════════════════════ -->
    <div class="matrix-section">
      <div class="matrix-title" v-html="titleB" />

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
                selected:    isBiasSelected(c - 1),
              }"
              :style="{ background: valColorRgb(bVal(c - 1)) }"
              @mouseenter="onBiasEnter(c - 1)"
              @mouseleave="clearHover"
              @click="onBiasClick(c - 1)"
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
  gap: 1.1rem;
  align-items: flex-start;
  padding: 0.15rem 0.25rem;
}

/* ══ Equation reference bar ══════════════════════════════════════ */
.eq-bar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.45rem 0.6rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.eq-item :deep(.katex) {
  font-size: 0.82rem;
  color: var(--color-text-primary);
}

.eq-sep {
  display: block;
  width: 1px;
  align-self: stretch;
  background: var(--color-border);
  flex-shrink: 0;
}

/* ══ Matrix section ══════════════════════════════════════════════ */
.matrix-section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.matrix-title {
  padding-left: 2.4rem; /* aligns above the cells, past corner + bracket */
  line-height: 1;
}

.matrix-title :deep(.katex) {
  font-size: 1rem;
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
  padding-bottom: 0.15rem;
}

.corner {
  width: 1.9rem;
  flex-shrink: 0;
}

.col-header-spacer {
  width: 7px;
  flex-shrink: 0;
}

/* ══ Column headers ══════════════════════════════════════════════ */
.col-header {
  min-width: 3rem;
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
  font-size: 0.78rem;
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

.col-header.selected :deep(.katex) {
  color: var(--color-selection);
  font-weight: 700;
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
  width: 1.9rem;
  flex-shrink: 0;
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.3rem;
  cursor: pointer;
  border-radius: 3px 0 0 3px;
  transition: opacity 0.15s;
  user-select: none;
  min-height: 1.9rem;
}

.row-header :deep(.katex) {
  font-size: 0.78rem;
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

.row-header.selected :deep(.katex) {
  color: var(--color-selection);
  font-weight: 700;
}

.row-header-ghost {
  pointer-events: none;
  min-height: 1.9rem;
}

/* ══ Brackets ════════════════════════════════════════════════════ */
.bracket {
  width: 7px;
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
  padding: 3px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

/* ══ Individual cell ═════════════════════════════════════════════ */
.matrix-cell {
  min-width: 3rem;
  min-height: 1.9rem;
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

.matrix-cell.selected {
  border-color: var(--color-selection);
  box-shadow: 0 0 0 2px var(--color-selection-ring);
}

.matrix-cell.dimmed {
  opacity: 0.3;
}

.cell-val {
  font-size: 0.68rem;
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  white-space: nowrap;
}
</style>
