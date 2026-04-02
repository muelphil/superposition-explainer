#!/usr/bin/env python3
"""
Plot: Overview of three types of bases.

Shows how different basis choices define different coordinate systems,
each overlaid on the standard Cartesian grid.

Basis vectors are defined at the top of this file and can be freely edited.
"""

import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

OUTPUT_PREFIX = "basis_types"

# ── Basis definitions (edit here) ────────────────────────────────────────────
# Each basis is a pair of 2D column vectors (e1, e2).

# 1. Arbitrary basis: not normalized, not orthogonal
#    e1·e2 = 2.0*0.5 + 0.5*1.5 = 1.0 + 0.75 = 1.75  (not orthogonal)
#    |e1| = √(4+0.25) ≈ 2.06,  |e2| = √(0.25+2.25) ≈ 1.58  (not unit)
BASIS_ARBITRARY = (
    np.array([2.0, 0.5]),
    np.array([0.5, 1.5]),
)

# 2. Orthogonal basis: orthogonal but NOT normalized
#    e1·e2 = 1.5*(−2/3) + 1.0*1.0 = −1 + 1 = 0  ✓
#    |e1| = √(2.25+1) ≈ 1.80,  |e2| = √(4/9+1) ≈ 1.20  (not unit)
BASIS_ORTHOGONAL = (
    np.array([1.5,  1.0]),
    np.array([-2/3, 1.0]),
)

# 3. Orthonormal basis: standard basis rotated 15° clockwise
#    |e1| = |e2| = 1, e1·e2 = 0  ✓
_THETA = np.radians(-15)   # negative = clockwise
BASIS_ORTHONORMAL = (
    np.array([ np.cos(_THETA), np.sin(_THETA)]),
    np.array([-np.sin(_THETA), np.cos(_THETA)]),
)

# ── Plot parameters ───────────────────────────────────────────────────────────
PLOT_EXTENT = 3.2          # axes run from -PLOT_EXTENT to +PLOT_EXTENT
GRID_RANGE  = range(-8, 9) # integer multiples of basis vectors to draw grid lines for

SUBPLOTS = [
    (BASIS_ARBITRARY,   "Arbitrary basis\n(non-orthogonal, non-normalized)"),
    (BASIS_ORTHOGONAL,  "Orthogonal basis\n(orthogonal, not normalized)"),
    (BASIS_ORTHONORMAL, "Orthonormal basis\n(unit vectors, 15° clockwise rotation)"),
]


# ── Drawing helpers ───────────────────────────────────────────────────────────

def _clip_line(origin: np.ndarray, direction: np.ndarray, extent: float):
    """
    Clip the parametric line  origin + t·direction  to the square [-extent, extent]².
    Returns (t_lo, t_hi) or None if the line misses the box entirely.
    """
    t_lo, t_hi = -np.inf, np.inf
    for i in range(2):
        if abs(direction[i]) < 1e-12:
            if abs(origin[i]) > extent:
                return None   # parallel and outside
        else:
            ta = (-extent - origin[i]) / direction[i]
            tb = ( extent - origin[i]) / direction[i]
            t_lo = max(t_lo, min(ta, tb))
            t_hi = min(t_hi, max(ta, tb))
    return (t_lo, t_hi) if t_lo <= t_hi else None


def draw_standard_grid(ax, extent):
    """Light-grey standard Cartesian grid in the background."""
    for k in range(int(-extent) - 1, int(extent) + 2):
        ax.axvline(k, color="#e0e0e0", linewidth=0.6, zorder=0)
        ax.axhline(k, color="#e0e0e0", linewidth=0.6, zorder=0)
    # Slightly darker zero-lines
    ax.axvline(0, color="#c0c0c0", linewidth=0.9, zorder=0)
    ax.axhline(0, color="#c0c0c0", linewidth=0.9, zorder=0)


def draw_basis_grid(ax, e1: np.ndarray, e2: np.ndarray, extent: float, grid_range):
    """Draw the coordinate grid induced by (e1, e2), in black axes + grey grid lines."""
    for n in grid_range:
        for offset_vec, dir_vec in [(e1, e2), (e2, e1)]:
            origin = n * offset_vec
            seg = _clip_line(origin, dir_vec, extent)
            if seg is None:
                continue
            t0, t1 = seg
            p0 = origin + t0 * dir_vec
            p1 = origin + t1 * dir_vec
            is_axis = (n == 0)
            ax.plot(
                [p0[0], p1[0]], [p0[1], p1[1]],
                color="black" if is_axis else "#a0a0a0",
                linewidth=1.4  if is_axis else 0.5,
                zorder=2       if is_axis else 1,
            )


def _fmt(v: float) -> str:
    """Format a scalar for LaTeX: avoid ugly -0, keep it compact."""
    v = 0.0 if abs(v) < 1e-9 else v
    # Use fractions for clean values, decimals otherwise
    if abs(v - round(v, 2)) < 1e-9:
        s = f"{v:.2g}"
    else:
        s = f"{v:.3f}".rstrip("0").rstrip(".")
    return s.replace("-", r"\text{-}")


def draw_basis_vectors(ax, e1: np.ndarray, e2: np.ndarray):
    """Draw e1 and e2 as bold arrows; annotate each with LaTeX coords + norm."""
    arrow_kw = dict(
        length_includes_head=True,
        head_width=0.09,
        head_length=0.09,
        linewidth=2.0,
        zorder=4,
    )
    ax.arrow(0, 0, e1[0], e1[1], color="#c0392b", **arrow_kw)
    ax.arrow(0, 0, e2[0], e2[1], color="#2471a3", **arrow_kw)

    for vec, idx, color in [(e1, "1", "#c0392b"), (e2, "2", "#2471a3")]:
        norm_val = np.linalg.norm(vec)
        unit = vec / norm_val if norm_val > 1e-9 else vec
        angle_deg = np.degrees(np.arctan2(vec[1], vec[0]))

        # Perpendicular offset so the box sits beside the arrow, not on it
        perp = np.array([-unit[1], unit[0]])
        # Flip perpendicular toward the interior of the plot to avoid clipping
        if np.dot(perp, -vec) < 0:
            perp = -perp
        box_center = vec + unit * 0.18 + perp * 0.55

        x1, y1 = _fmt(vec[0]), _fmt(vec[1])
        label = (
            rf"$\mathbf{{e}}_{idx} = ({x1},\,{y1})^\top$"
            "\n"
            rf"$\|\mathbf{{e}}_{idx}\| = {norm_val:.2f}$"
            "\n"
            rf"$\angle\,x\text{{-axis}} = {angle_deg:.1f}°$"
        )
        ax.text(
            box_center[0], box_center[1], label,
            color=color, fontsize=8.5, ha="center", va="center", zorder=6,
            bbox=dict(
                boxstyle="round,pad=0.35",
                facecolor="white", edgecolor=color,
                alpha=0.93, linewidth=0.9,
            ),
        )


# ── Main ──────────────────────────────────────────────────────────────────────

def make_plot(output_prefix: str = OUTPUT_PREFIX):
    script_dir = Path(__file__).parent

    fig, axes = plt.subplots(1, 3, figsize=(15, 5.8))
    fig.patch.set_facecolor("white")

    for ax, ((e1, e2), subtitle) in zip(axes, SUBPLOTS):
        ax.set_facecolor("white")

        draw_standard_grid(ax, PLOT_EXTENT)
        draw_basis_grid(ax, e1, e2, PLOT_EXTENT, GRID_RANGE)
        draw_basis_vectors(ax, e1, e2)

        ax.plot(0, 0, "ko", markersize=4, zorder=6)

        ax.set_xlim(-PLOT_EXTENT, PLOT_EXTENT)
        ax.set_ylim(-PLOT_EXTENT, PLOT_EXTENT)
        ax.set_aspect("equal")
        ax.set_title(subtitle, fontsize=11.5, pad=10, fontweight="bold")
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(True)
            spine.set_linewidth(1.2)
            spine.set_edgecolor("#444444")

    fig.suptitle("Basis types and their induced coordinate systems",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout(w_pad=2.0)

    png_path     = script_dir / f"{output_prefix}.png"
    svg_path     = script_dir / f"{output_prefix}.svg"
    caption_path = script_dir / f"{output_prefix}_caption.txt"

    fig.savefig(str(png_path), dpi=300, bbox_inches="tight")
    fig.savefig(str(svg_path), bbox_inches="tight")
    plt.close(fig)

    caption = (
        "Three types of vector bases and their induced coordinate systems in \u211d\u00b2. "
        "Each panel overlays the standard Cartesian grid (light grey, background) "
        "with the coordinate grid defined by the two basis vectors \u1d52\u2081 (red) and \u1d52\u2082 (blue). "
        "The custom grid axes are drawn in black; intermediate grid lines in grey. "
        "Left \u2013 Arbitrary basis: the vectors are neither orthogonal nor unit-length, "
        "producing a sheared, non-uniform grid. "
        "Centre \u2013 Orthogonal basis: the vectors are perpendicular but have different "
        "lengths, giving a rectangular grid that is not square. "
        "Right \u2013 Orthonormal basis: the standard basis rotated 15\u00b0 clockwise, "
        "preserving both perpendicularity and unit length and yielding a congruent "
        "but rotated copy of the standard grid."
    )
    caption_path.write_text(caption, encoding="utf-8")

    print(f"Saved: {png_path}")
    print(f"Saved: {svg_path}")
    print(f"Saved: {caption_path}")
    print(f"\nCaption:\n{caption}")


if __name__ == "__main__":
    make_plot()
