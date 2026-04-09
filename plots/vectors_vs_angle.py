#!/usr/bin/env python3
"""
Plot: Maximum number of unit vectors packable into d-dimensional space
      with every pairwise angle ≥ α.

X-axis runs from 90° (left) to a configurable lower bound (default 45°, right).
At 90° each dimension d accommodates exactly 2d vectors (cross-polytope);
as the angle threshold decreases the count rises in discrete steps.

Data sources:
  • Closed-form solutions for regular simplices (n ≤ d+1) and cross-polytopes (n = 2d)
  • Numerically optimal spherical codes from N.J.A. Sloane's tables (spherical-codes.org)

Usage:
    python vectors_vs_angle.py [--min-angle 45] [--dim-min 3] [--dim-max 10]
                               [--linear-scale] [--output-prefix NAME]
"""

import argparse
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_MIN_ANGLE = 45  # right edge of plot (left edge is always 90°)
DEFAULT_DIM_MIN = 3
DEFAULT_DIM_MAX = 15
DEFAULT_LOG_SCALE = False
DATA_FILE = "spherical_codes_table.txt"
OUTPUT_PREFIX = "vectors_vs_angle"


# ── Closed-form solutions ────────────────────────────────────────────────────
def closed_form_entries(d: int) -> list[tuple[int, float]]:
    """Known optimal spherical codes for n ≤ 2d in d dimensions."""
    entries: list[tuple[int, float]] = []
    # Regular simplex: n vertices (n ≤ d+1), inner product = −1/(n−1)
    for n in range(2, d + 2):
        entries.append((n, -1.0 / (n - 1)))
    # Cross-polytope subsets (d+2 … 2d): orthogonal basis pairs → cos = 0
    for n in range(d + 2, 2 * d + 1):
        entries.append((n, 0.0))
    return entries


# ── Parse spherical-codes table ──────────────────────────────────────────────
def parse_table(path: str, dim_min: int, dim_max: int) -> dict[int, list[tuple[int, float]]]:
    """Read (d, n, cos_max[, poly]) CSV and merge closed-form solutions."""
    data: dict[int, list[tuple[int, float]]] = {}
    with open(path, "r") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 3:
                continue
            d, n, cos_max = int(parts[0]), int(parts[1]), float(parts[2])
            if dim_min <= d <= dim_max:
                data.setdefault(d, []).append((n, cos_max))

    for d in range(dim_min, dim_max + 1):
        existing = {e[0] for e in data.get(d, [])}
        for n, cos_max in closed_form_entries(d):
            if n not in existing:
                data.setdefault(d, []).append((n, cos_max))
    return data


# ── Build step-function transitions ──────────────────────────────────────────
def build_transitions(entries: list[tuple[int, float]]) -> list[tuple[float, int]]:
    """
    From raw (n, cos_max) pairs, compute the strictly-increasing transition list.

    Returns [(cos_threshold, cumulative_max_n), …] sorted by cos ascending.
    A transition (c, N) means: for cos(α) ≥ c the achievable count reaches N.
    """
    sorted_entries = sorted(entries, key=lambda x: x[1])
    transitions: list[tuple[float, int]] = []
    running_max = 0
    for n, cos_max in sorted_entries:
        if n > running_max:
            running_max = n
            transitions.append((cos_max, running_max))
    return transitions


def step_coords(
        transitions: list[tuple[float, int]],
        plot_min: float = 0.0,
        plot_max: float = 45.0,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert transitions into (x, y) arrays that draw crisp step-function lines.

    The step function is:  max_n(α) = max{N : cos_max(N) ≤ cos(α)}
    As α increases, cos(α) shrinks → fewer entries qualify → max_n drops.
    """
    if not transitions:
        return np.array([plot_min, plot_max]), np.array([1, 1])

    k = len(transitions)
    cos_vals = [c for c, _ in transitions]
    n_vals = [n for _, n in transitions]

    # Transition angles (descending, since cos ascending ↔ angle descending)
    angles = [np.degrees(np.arccos(np.clip(c, -1, 1))) for c in cos_vals]

    # Start from the left edge at the maximum achievable N
    xs: list[float] = [plot_min]
    ys: list[float] = [float(n_vals[-1])]

    # Walk from the largest N (smallest angle, index k−1) toward the smallest N
    for i in range(k - 1, -1, -1):
        angle = angles[i]
        if angle <= plot_min:
            # transition is before our view – the level at plot_min is this N
            ys[0] = float(n_vals[i])
            continue
        if angle > plot_max:
            break

        # horizontal segment up to this angle at the current level
        xs.append(angle)
        ys.append(ys[-1])

        # vertical drop to the next level
        next_n = float(n_vals[i - 1]) if i > 0 else 1.0
        xs.append(angle)
        ys.append(next_n)

    # extend to the right edge
    xs.append(plot_max)
    ys.append(ys[-1])

    return np.array(xs), np.array(ys)


# ── Main plotting routine ────────────────────────────────────────────────────
def generate_plot(
        min_angle_deg: float = DEFAULT_MIN_ANGLE,
        dim_min: int = DEFAULT_DIM_MIN,
        dim_max: int = DEFAULT_DIM_MAX,
        log_scale: bool = DEFAULT_LOG_SCALE,
        data_file: str = DATA_FILE,
        output_prefix: str = OUTPUT_PREFIX,
):
    script_dir = Path(__file__).parent
    data = parse_table(str(script_dir / data_file), dim_min, dim_max)

    dims = list(range(dim_min, dim_max + 1))
    n_dims = len(dims)

    # Color gradient: forest-green (lowest d) → warm yellow (highest d)
    green = np.array([0.13, 0.55, 0.13])
    yellow = np.array([0.93, 0.83, 0.10])
    colors = [green + (yellow - green) * i / max(n_dims - 1, 1) for i in range(n_dims)]

    # ── Determine data ceiling ─────────────────────────────────────────────
    # The spherical-codes table has a finite upper bound on n (typically 1024).
    # Find the angle at which the highest dimension reaches that ceiling;
    # clamp the right edge of the plot there so we never show a misleading plateau.
    all_transitions: dict[int, list[tuple[float, int]]] = {}
    for d in dims:
        entries = data.get(d, [])
        if entries:
            all_transitions[d] = build_transitions(entries)

    top_dim = max(d for d in all_transitions)
    top_trans = all_transitions[top_dim]
    data_cap_n = top_trans[-1][1]  # largest N in data for top dim
    data_cap_cos = top_trans[-1][0]
    data_cap_angle = np.degrees(np.arccos(np.clip(data_cap_cos, -1, 1)))

    effective_min = min_angle_deg
    if min_angle_deg < data_cap_angle:
        effective_min = np.ceil(data_cap_angle)  # round up to next whole degree
        print(
            f"WARNING: Spherical-codes data for d={top_dim} only covers down to "
            f"≈{data_cap_angle:.1f}° (n={data_cap_n}). "
            f"Clamping right edge from {min_angle_deg:.0f}° to {effective_min:.0f}° "
            f"to avoid a misleading plateau."
        )

    # ── Plot ───────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(12, 7))

    for idx, d in enumerate(dims):
        trans = all_transitions.get(d)
        if not trans:
            continue
        x, y = step_coords(trans, effective_min, 90.0)
        ax.plot(x, y, color=colors[idx], linewidth=1.8, label=f"d = {d}", alpha=0.9)

    if log_scale:
        ax.set_yscale("log")

    # Inverted x-axis: 90° on the left, effective_min on the right
    ax.set_xlim(90, effective_min)
    ax.set_xlabel("Minimum pairwise angle α (degrees)", fontsize=13)
    ax.set_ylabel("Maximum number of vectors", fontsize=13)
    ax.set_title(
        f"Packing unit vectors with angular separation \u2265 \u03b1  (d = {dim_min}\u2013{dim_max})",
        fontsize=14,
        pad=12,
    )

    # legend: highest dimension on top, placed lower-right (values rise toward the right)
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles[::-1], labels[::-1], loc="upper left", fontsize=10, framealpha=0.9)

    # Light-grey y-axis grid to emphasise the logarithmic scale
    ax.grid(axis="y", which="major", color="#d0d0d0", linewidth=0.6)
    ax.grid(axis="y", which="minor", color="#e8e8e8", linewidth=0.4)
    ax.grid(axis="x", which="major", color="#e8e8e8", linewidth=0.4)
    ax.tick_params(labelsize=11)
    plt.tight_layout()

    # ── save outputs ──────────────────────────────────────────────────────
    png_path = script_dir / f"{output_prefix}.png"
    svg_path = script_dir / f"{output_prefix}.svg"
    caption_path = script_dir / f"{output_prefix}_caption.txt"

    fig.savefig(str(png_path), dpi=300, bbox_inches="tight")
    fig.savefig(str(svg_path), bbox_inches="tight")
    plt.close(fig)

    scale_word = "logarithmic" if log_scale else "linear"
    caption = (
        f"Maximum number of unit vectors that can be simultaneously placed in a "
        f"d-dimensional space (d = {dim_min} to {dim_max}) such that every pair "
        f"subtends an angle of at least \u03b1 degrees. "
        f"The x-axis runs from 90\u00b0 (left) to {effective_min:.0f}\u00b0 (right); "
        f"the y-axis uses a {scale_word} scale. "
        f"At 90\u00b0 each dimension d can hold exactly 2d vectors (the cross-polytope); "
        f"as the angle threshold decreases the achievable count rises in discrete steps, "
        f"with higher-dimensional spaces (yellow) accommodating substantially more "
        f"vectors than lower-dimensional ones (green). "
        f"This illustrates why superposition\u2014representing more features than available "
        f"dimensions\u2014becomes increasingly viable as dimensionality grows. "
        f"Data combines closed-form solutions for regular simplices and cross-polytopes "
        f"with numerically optimal spherical codes from N.\u202fJ.\u202fA. Sloane\u2019s tables "
        f"(spherical-codes.org)."
    )
    caption_path.write_text(caption, encoding="utf-8")

    print(f"Saved: {png_path}")
    print(f"Saved: {svg_path}")
    print(f"Saved: {caption_path}")
    print(f"\nCaption:\n{caption}")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Plot maximum vectors vs minimum pairwise angle in d dimensions"
    )
    parser.add_argument(
        "--min-angle", type=float, default=DEFAULT_MIN_ANGLE,
        help=f"Right edge of the x-axis in degrees (default: {DEFAULT_MIN_ANGLE})",
    )
    parser.add_argument(
        "--dim-min", type=int, default=DEFAULT_DIM_MIN,
        help=f"Lowest dimension to plot (default: {DEFAULT_DIM_MIN})",
    )
    parser.add_argument(
        "--dim-max", type=int, default=DEFAULT_DIM_MAX,
        help=f"Highest dimension to plot (default: {DEFAULT_DIM_MAX})",
    )
    parser.add_argument(
        "--log-scale", action="store_true", default=DEFAULT_LOG_SCALE,
        help="Use logarithmic y-axis (default)",
    )
    parser.add_argument(
        "--output-prefix", type=str, default=OUTPUT_PREFIX,
        help=f'Filename prefix for outputs (default: "{OUTPUT_PREFIX}")',
    )
    args = parser.parse_args()

    generate_plot(
        min_angle_deg=args.min_angle,
        dim_min=args.dim_min,
        dim_max=args.dim_max,
        log_scale=args.log_scale,
        output_prefix=args.output_prefix,
    )
