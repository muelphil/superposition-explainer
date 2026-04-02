import math


def format_params(n: int) -> str:
    """
    Format raw parameter count into human-readable M / B / T units.
    """
    if n >= 1_000_000_000_000:
        return f"{n / 1_000_000_000_000:.3f}T"
    elif n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.3f}B"
    elif n >= 1_000_000:
        return f"{n / 1_000_000:.3f}M"
    else:
        return f"{n:,}"


def gpt3_params_from_dmodel(
        d_model: int,
        n_layers: int = 96,
        vocab_size: int = 50257,
        context_length: int = 2048,
) -> int:
    """
    Approximate total parameter count for a GPT-3-style dense decoder transformer.

    Formula:
        P(d) ≈ 12 * L * d^2 + (V + n_ctx) * d

    Assumptions:
    - standard dense self-attention
    - FFN expansion ratio = 4
    - tied token embeddings
    - learned positional embeddings
    - ignores tiny LayerNorm / bias terms

    Returns:
        total parameter count as integer
    """
    return 12 * n_layers * d_model * d_model + (vocab_size + context_length) * d_model


def gpt3_dmodel_from_params(
        total_params: int,
        n_layers: int = 96,
        vocab_size: int = 50257,
        context_length: int = 2048,
) -> float:
    """
    Invert the GPT-3-style parameter formula to estimate d_model from target params.

    Solves:
        P = 12*L*d^2 + (V+n_ctx)*d

    Returns:
        estimated d_model (float)
    """
    a = 12 * n_layers
    b = vocab_size + context_length
    c = -total_params

    # Positive root of quadratic
    return (-b + math.sqrt(b * b - 4 * a * c)) / (2 * a)


def print_gpt3_model_summary(d_model: int):
    """
    Print a nice summary for a GPT-3-style model width.
    """
    total = gpt3_params_from_dmodel(d_model)

    block_params = 12 * 96 * d_model * d_model
    embed_params = (50257 + 2048) * d_model

    print(f"d_model = {d_model:,}")
    print(f"Total params:      {total:,}  ({format_params(total)})")
    print(f"Transformer block: {block_params:,}  ({format_params(block_params)})")
    print(f"Embeddings+pos:    {embed_params:,}  ({format_params(embed_params)})")
    print(f"Embedding share:   {100 * embed_params / total:.4f}%")
    print()


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
from pathlib import Path

OUTPUT_PREFIX = "model_size_depending_on_emb_dim"

# Five prominent architecture families (name, n_layers, vocab_size, n_ctx)
ARCHITECTURES = [
    ("GPT-3 family\n(L = 96)",      96,  50_257, 2048),
    ("LLaMA-2 70B\n(L = 80)",       80,  32_000, 4096),
    ("GPT-2 XL family\n(L = 48)",   48,  50_257, 1024),
    ("LLaMA-2 7B / Mistral\n(L = 32)", 32, 32_000, 4096),
    ("BERT-Large family\n(L = 24)", 24,  30_522,  512),
]

# Well-known reference models: (label, d_model, n_layers, vocab_size, n_ctx, y_offset_factor)
# y_offset_factor nudges annotation above (>1) or below (<1) the marker
REFERENCE_MODELS = [
    ("GPT-3\n175B",   12288, 96, 50_257, 2048,  1.2),
    ("LLaMA-2\n70B",  8192,  80, 32_000, 4096,  1.2),
    ("GPT-2 XL\n1.5B", 1600, 48, 50_257, 1024,  1.2),
    ("LLaMA-2\n7B",   4096,  32, 32_000, 4096,  1.2),
    ("BERT-\nLarge",  1024,  24, 30_522,  512,   2.0),
]

# Colour palette – visually distinct, print-friendly
COLORS = ["#e05c2e", "#3b7dd8", "#27a35e", "#9b59b6", "#c0a000"]


def make_plot(output_prefix: str = OUTPUT_PREFIX):
    script_dir = Path(__file__).parent
    d_range = np.linspace(256, 16_384, 2000)

    fig, ax = plt.subplots(figsize=(12, 7))

    for (name, n_layers, vocab, ctx), color in zip(ARCHITECTURES, COLORS):
        params = [gpt3_params_from_dmodel(int(d), n_layers, vocab, ctx) for d in d_range]
        ax.plot(d_range, params, color=color, linewidth=2.0, label=name, alpha=0.9)

    # Reference model annotations
    for label, d, n_layers, vocab, ctx, y_off in REFERENCE_MODELS:
        p = gpt3_params_from_dmodel(d, n_layers, vocab, ctx)
        # find the matching architecture color
        color = next(
            c for (_, nl, v, x), c in zip(ARCHITECTURES, COLORS)
            if nl == n_layers and v == vocab
        )
        ax.scatter([d], [p], color=color, s=60, zorder=5)
        ax.annotate(
            label,
            xy=(d, p),
            xytext=(d, p * y_off),
            fontsize=8,
            ha="center",
            color=color,
            arrowprops=dict(arrowstyle="-", color=color, lw=0.8),
        )

    # ax.set_yscale("log")
    ax.set_xlim(256, 16_384)

    # Y-axis: human-readable labels
    def param_fmt(x, _):
        if x >= 1e12: return f"{x/1e12:.0f}T"
        if x >= 1e9:  return f"{x/1e9:.0f}B"
        if x >= 1e6:  return f"{x/1e6:.0f}M"
        return f"{x:.0f}"

    ax.yaxis.set_major_formatter(ticker.FuncFormatter(param_fmt))

    # Light-grey horizontal grid to emphasise log scale
    ax.grid(axis="y", which="major", color="#d0d0d0", linewidth=0.6)
    ax.grid(axis="y", which="minor", color="#ebebeb", linewidth=0.4)
    ax.grid(axis="x", which="major", color="#ebebeb", linewidth=0.4)

    ax.set_xlabel("Embedding / model dimension  d_model", fontsize=13)
    ax.set_ylabel("Total parameters", fontsize=13)
    ax.set_title(
        "Model size vs. embedding dimension for prominent transformer families",
        fontsize=14, pad=12,
    )
    ax.legend(fontsize=9.5, loc="upper left", framealpha=0.92)
    ax.tick_params(labelsize=11)
    plt.tight_layout()

    png_path = script_dir / f"{output_prefix}.png"
    svg_path = script_dir / f"{output_prefix}.svg"
    caption_path = script_dir / f"{output_prefix}_caption.txt"

    fig.savefig(str(png_path), dpi=300, bbox_inches="tight")
    fig.savefig(str(svg_path), bbox_inches="tight")
    plt.close(fig)

    caption = (
        "Total parameter count of a GPT-style dense decoder transformer as a function "
        "of its embedding / model dimension d_model, for five prominent architecture "
        "families. Parameter count is approximated as P \u2248 12\u00b7L\u00b7d\u00b2 + (V + n_ctx)\u00b7d, "
        "where L is the number of transformer layers, V the vocabulary size, and "
        "n_ctx the context length. The y-axis uses a logarithmic scale. "
        "Because P grows quadratically with d, even modest increases in embedding "
        "dimension incur a steep cost in parameters. "
        "Reference points mark the published widths of GPT-3 175B, LLaMA-2 70B, "
        "GPT-2 XL, LLaMA-2 7B / Mistral 7B, and BERT-Large."
    )
    caption_path.write_text(caption, encoding="utf-8")

    print(f"Saved: {png_path}")
    print(f"Saved: {svg_path}")
    print(f"Saved: {caption_path}")
    print(f"\nCaption:\n{caption}")


if __name__ == "__main__":
    make_plot()