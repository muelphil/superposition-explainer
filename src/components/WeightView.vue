<script setup lang="ts">
import { inject, computed } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import type { SelectionServiceType, SelectionTarget } from '../services/SelectionService'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

const m = computed(() => svc.config.embeddingDim)  // rows  (h₁…hₘ)
const n = computed(() => svc.config.inputDim)       // cols  (f₁…fₙ)

// ─── Illumination ─────────────────────────────────────────────────────────────
// null = everything lit (no active hover/selection)

interface WvIllum {
  wRows: Set<number> | 'all'
  wCols: Set<number> | 'all'
  wCell: { r: number; c: number } | null
  bCols: Set<number> | 'all'
}

function illumForTarget(t: SelectionTarget): WvIllum | null {
  if (!t) return null
  switch (t.kind) {
    // Feature, input, output all map to the same column + bias
    case 'feature':
    case 'input':
    case 'output':
      return { wRows: 'all', wCols: new Set([t.idx]), wCell: null, bCols: new Set([t.idx]) }
    // Embedding → entire row of W; bias has no embedding connection
    case 'emb':
      return { wRows: new Set([t.idx]), wCols: 'all', wCell: null, bCols: new Set() }
    // Bias and relu → only the bias cell (W fully dimmed per spec)
    case 'bias':
    case 'relu':
      return { wRows: new Set(), wCols: new Set(), wCell: null, bCols: new Set([t.idx]) }
    // Weight cell → only that specific cell
    case 'weight':
      return { wRows: new Set(), wCols: new Set(), wCell: { r: t.row, c: t.col }, bCols: new Set() }
    default:
      return null
  }
}

// Selection takes precedence over hover
const activeIllum = computed<WvIllum | null>(() => {
  const sel = selSvc.selected.value
  if (sel) return illumForTarget(sel)
  const hov = selSvc.hovered.value
  if (hov) return illumForTarget(hov)
  return null
})

function isActive(): boolean {
  return activeIllum.value !== null
}

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

// ─── Selection indicators (outline/border on selected items) ──────────────────

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

function clearHover() {
  selSvc.clearHover()
}

// ── Selection service wrappers ─────────────────────────────────
function onColEnter(c: number) {
  selSvc.setHover({ kind: 'feature', idx: c }, 'weights')
}
function onColClick(c: number) {
  selSvc.setSelected({ kind: 'feature', idx: c }, 'weights')
}

function onRowEnter(r: number) {
  selSvc.setHover({ kind: 'emb', idx: r }, 'weights')
}
function onRowClick(r: number) {
  selSvc.setSelected({ kind: 'emb', idx: r }, 'weights')
}

function onCellEnter(r: number, c: number) {
  selSvc.setHover({ kind: 'weight', row: r, col: c }, 'weights')
}
function onCellClick(r: number, c: number) {
  selSvc.setSelected({ kind: 'weight', row: r, col: c }, 'weights')
}

// Bias hover/select uses 'bias' kind — highlights only the bias cell
function onBiasEnter(c: number) {
  selSvc.setHover({ kind: 'bias', idx: c }, 'weights')
}
function onBiasClick(c: number) {
  selSvc.setSelected({ kind: 'bias', idx: c }, 'weights')
}

// ── Color matching AutoencoderView neuron colors ──────────────
// Negative → blue #3b82f6, Zero → white, Positive → orange #f97316
function valColor(val: number, alpha = 1): string {
  const t = Math.max(-1, Math.min(1, val))
  let r: number, g: number, b: number
  if (t >= 0) {
    r = Math.round(255 + (249 - 255) * t)
    g = Math.round(255 + (115 - 255) * t)
    b = Math.round(255 + (22  - 255) * t)
  } else {
    const s = -t
    r = Math.round(255 + (59  - 255) * s)
    g = Math.round(255 + (130 - 255) * s)
    b = Math.round(255 + (246 - 255) * s)
  }
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`
}

function fmt(v: number): string {
  const s = v.toFixed(2)
  return v >= 0 ? `\u200b${s}` : s  // zero-width space for positive alignment
}

function wVal(r: number, c: number): number {
  return svc.W.value[r]?.[c] ?? 0
}

function bVal(c: number): number {
  return svc.b.value[c] ?? 0
}

function featureVecLength(c: number): number {
  let sum = 0
  for (let k = 0; k < m.value; k++) {
    const w = svc.W.value[k]?.[c] ?? 0
    sum += w * w
  }
  return Math.sqrt(sum)
}

// Subscript helpers
function sub(i: number): string {
  return String(i + 1)
    .split('')
    .map(d => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
    .join('')
}
</script>

<template>
  <div class="wv-root" @mouseleave="clearHover">

    <!-- ══ Weight matrix W ══════════════════════════════════════ -->
    <div class="matrix-section">
      <div class="matrix-title">W</div>

      <div class="matrix-layout">
        <!-- Column headers row -->
        <div class="col-headers-row">
          <div class="corner" />
          <div class="col-header-spacer" />
          <div
            v-for="c in n" :key="c"
            class="col-header"
            :class="{
              highlighted: colHeaderHighlighted(c - 1),
              dimmed: isActive() && !colHeaderHighlighted(c - 1),
              selected: isColSelected(c - 1),
            }"
            :title="`f${sub(c - 1)}  |f| = ${featureVecLength(c - 1).toFixed(3)}`"
            @mouseenter="onColEnter(c - 1)"
            @mouseleave="clearHover"
            @click="onColClick(c - 1)"
          >
            <span class="ann-bold">f</span><span class="ann-sub">{{ sub(c - 1) }}</span>
          </div>
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
                dimmed: isActive() && !rowHeaderHighlighted(r - 1),
                selected: isRowSelected(r - 1),
              }"
              @mouseenter="onRowEnter(r - 1)"
              @mouseleave="clearHover"
              @click="onRowClick(r - 1)"
            >
              <span class="ann-bold">h</span><span class="ann-sub">{{ sub(r - 1) }}</span>
            </div>
          </div>
          <div class="bracket bracket-left" />
          <div class="cell-grid" :style="{ gridTemplateColumns: `repeat(${n}, 1fr)` }">
            <template v-for="r in m" :key="r">
              <div
                v-for="c in n" :key="`${r}-${c}`"
                class="matrix-cell"
                :class="{
                  highlighted: cellHighlighted(r - 1, c - 1),
                  dimmed: isActive() && !cellHighlighted(r - 1, c - 1),
                  selected: isCellSelected(r - 1, c - 1),
                }"
                :style="{ background: valColor(wVal(r - 1, c - 1)) }"
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
      <div class="matrix-title">b</div>

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
                dimmed: isActive() && !biasHighlighted(c - 1),
                selected: isBiasSelected(c - 1),
              }"
              :style="{ background: valColor(bVal(c - 1)) }"
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
  gap: 1.5rem;
  align-items: flex-start;
  padding: 0.25rem;
  font-family: 'Georgia', 'Times New Roman', serif;
}

/* ── Section ──────────────────────────────────────────────────── */
.matrix-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.matrix-title {
  font-size: 1.15rem;
  font-style: italic;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1;
  padding-left: 2.5rem; /* indent past corner + bracket so it aligns above cells */
}

/* ── Layout grid (col-headers + body stacked) ─────────────────── */
.matrix-layout {
  display: flex;
  flex-direction: column;
}

/* ── Column headers row ───────────────────────────────────────── */
.col-headers-row {
  display: flex;
  align-items: center;
}

.corner {
  width: 2rem;  /* matches row-label width */
  flex-shrink: 0;
}

.col-header-spacer {
  width: 8px;   /* matches bracket width */
  flex-shrink: 0;
}

.col-header {
  min-width: 3.2rem;
  text-align: center;
  padding-bottom: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-text-label);
  cursor: pointer;
  border-radius: 3px 3px 0 0;
  transition: opacity 0.15s, color 0.15s;
  user-select: none;
}

.col-header-ghost {
  min-width: 3.2rem;
  cursor: default;
  pointer-events: none;
}

.col-header.highlighted {
  color: var(--color-text-primary);
  font-weight: 700;
}

/* ── Matrix body row ──────────────────────────────────────────── */
.matrix-body-row {
  display: flex;
  align-items: stretch;
}

/* ── Row labels ───────────────────────────────────────────────── */
.row-labels {
  display: flex;
  flex-direction: column;
  width: 2rem;
  flex-shrink: 0;
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-text-label);
  cursor: pointer;
  border-radius: 3px 0 0 3px;
  transition: opacity 0.15s, color 0.15s;
  user-select: none;
  min-height: 2rem;
}

.row-header-ghost {
  pointer-events: none;
  min-height: 2rem;
}

.row-header.highlighted {
  color: var(--color-text-primary);
  font-weight: 700;
}

/* ── Brackets ─────────────────────────────────────────────────── */
.bracket {
  width: 8px;
  flex-shrink: 0;
  border-top: 2px solid #6b7280;
  border-bottom: 2px solid #6b7280;
}

.bracket-left {
  border-left: 2px solid #6b7280;
  border-radius: 3px 0 0 3px;
}

.bracket-right {
  border-right: 2px solid #6b7280;
  border-radius: 0 3px 3px 0;
}

/* ── Cell grid ────────────────────────────────────────────────── */
.cell-grid {
  display: grid;
  gap: 2px;
  padding: 4px;
  background: #f8fafc; /* slate-50, inset feel */
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

/* ── Individual cell ──────────────────────────────────────────── */
.matrix-cell {
  min-width: 3.2rem;
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  cursor: pointer;
  transition: opacity 0.15s, filter 0.15s;
  position: relative;
  border: 1px solid transparent;
}

.matrix-cell.highlighted {
  border-color: #9ca3af;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.06);
}

.matrix-cell.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
}

.matrix-cell.dimmed {
  opacity: 0.35;
}

.cell-val {
  font-size: 0.72rem;
  font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  color: #1e293b;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* ── Annotation text helpers ──────────────────────────────────── */
.ann-bold { font-style: italic; }
.ann-sub  { font-size: 0.65em; vertical-align: sub; line-height: 0; }

/* ── Dimmed state ─────────────────────────────────────────────── */
.col-header.dimmed,
.row-header.dimmed {
  opacity: 0.35;
}

.col-header.selected,
.row-header.selected {
  color: #6366f1;
  font-weight: 700;
}
</style>
