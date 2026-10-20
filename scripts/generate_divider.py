"""Generate an original bronze-wood section divider with a centre gem.

Drawn from scratch (wood grain noise, bevel lighting, faceted gem) at 4x
resolution and downsampled for clean edges.

Usage: python scripts/generate_divider.py [output.webp] [--seed N]
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2560, 72  # wide enough that the rail never ends on large screens
SS = 4  # supersampling factor


def wood_rail(rng, w, h):
    """Horizontal bronze-wood rail with grain, bevel highlight and shadow."""
    # Grain: noise stretched far along x so it reads as wood fibres
    grain = rng.random((h // 2 + 1, w // 60 + 1)).astype(np.float32)
    grain = np.asarray(Image.fromarray((grain * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255
    fine = rng.random((h, w // 8)).astype(np.float32)
    fine = np.asarray(Image.fromarray((fine * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
    tone = 0.75 + 0.25 * grain + 0.12 * (fine - 0.5)

    base = np.array([150, 98, 46], np.float32)
    rgb = base[None, None, :] * tone[..., None]

    y = np.linspace(0, 1, h)[:, None]
    bevel = np.where(y < 0.18, 1.45, np.where(y > 0.82, 0.45, 1.0))      # lit top edge, shaded bottom
    groove = 1 - 0.35 * np.exp(-((y - 0.5) ** 2) / 0.004)                 # a carved line along the middle
    rgb *= (bevel * groove)[..., None]

    return np.clip(rgb * 0.92, 0, 255)  # slightly aged bronze


def gem(size, rng):
    """Bronze diamond frame holding a faceted teal gem."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size / 2
    diamond = lambda r: [(c, c - r), (c + r, c), (c, c + r), (c - r, c)]

    outer, frame_in, gem_in = c * 0.98, c * 0.78, c * 0.36
    d.polygon(diamond(outer), fill=(70, 42, 16, 255))                     # dark outline
    d.polygon(diamond(outer * 0.94), fill=(176, 120, 52, 255))            # bronze frame
    # Bevel: light upper-left facets, dark lower-right facets of the frame
    d.polygon([(c - outer * 0.94, c), (c, c - outer * 0.94), (c, c - frame_in), (c - frame_in, c)], fill=(222, 170, 92, 255))
    d.polygon([(c + outer * 0.94, c), (c, c + outer * 0.94), (c, c + frame_in), (c + frame_in, c)], fill=(112, 70, 28, 255))

    # Gem facets
    d.polygon(diamond(frame_in), fill=(38, 150, 178, 255))
    d.polygon([(c, c - frame_in), (c + frame_in, c), (c + gem_in, c), (c, c - gem_in)], fill=(86, 214, 220, 255))   # top-right, bright
    d.polygon([(c, c - frame_in), (c - frame_in, c), (c - gem_in, c), (c, c - gem_in)], fill=(64, 190, 206, 255))   # top-left
    d.polygon([(c, c + frame_in), (c - frame_in, c), (c - gem_in, c), (c, c + gem_in)], fill=(30, 128, 164, 255))   # bottom-left
    d.polygon([(c, c + frame_in), (c + frame_in, c), (c + gem_in, c), (c, c + gem_in)], fill=(22, 104, 146, 255))   # bottom-right, dark
    d.polygon(diamond(gem_in), fill=(26, 112, 158, 255))                                                              # table
    d.polygon([(c, c - gem_in), (c + gem_in * 0.55, c - gem_in * 0.45), (c, c)], fill=(120, 230, 232, 200))          # glint

    # Subtle sparkle noise across the gem
    arr = np.asarray(img, np.float32)
    mask = arr[..., 3] > 0
    arr[..., :3] += (rng.random(arr.shape[:2])[..., None] - 0.5) * 18 * mask[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?', default='frontend/public/textures/divider-gem.webp')
    parser.add_argument('--seed', type=int, default=11)
    args = parser.parse_args()
    rng = np.random.default_rng(args.seed)

    w, h = W * SS, H * SS
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    rail_h = 16 * SS
    rail = wood_rail(rng, w, rail_h)
    rail_img = Image.fromarray(np.dstack([rail, np.full(rail.shape[:2], 255, np.float32)]).astype(np.uint8), 'RGBA')
    canvas.alpha_composite(rail_img, (0, (h - rail_h) // 2))

    # Soft drop shadow under the gem, then the gem itself
    g = gem(H * SS, rng)
    shadow = Image.new('RGBA', g.size, (0, 0, 0, 0))
    shadow.putalpha(g.getchannel('A').point(lambda a: int(a * 0.55)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(4 * SS))
    x = (w - g.width) // 2
    canvas.alpha_composite(shadow, (x, 2 * SS))
    canvas.alpha_composite(g, (x, 0))

    canvas.resize((W, H), Image.LANCZOS).save(args.output, quality=90, method=6)
    print(f'wrote {args.output}')


if __name__ == '__main__':
    main()
