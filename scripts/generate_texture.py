"""Generate an original cracked-plaster background texture.

The texture is meant to be blended with `background-blend-mode: overlay`
on top of a dark gradient. Its tone (mean/contrast) is matched to the values
measured by `extract_background.mjs`, but every pixel is generated here.

Usage: python scripts/generate_texture.py [output.webp] [--seed N]
"""
import argparse
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1600
TARGET_MEAN = 150.7  # measured reference tone
TARGET_STD = 17.8


def fbm(rng, size, octaves=6, base=4, persistence=0.55):
    """Fractal value noise: sum of upscaled random grids."""
    out = np.zeros((size, size), np.float32)
    amp, total = 1.0, 0.0
    for octave in range(octaves):
        cells = base * 2 ** octave
        grid = rng.random((cells + 1, cells + 1)).astype(np.float32)
        layer = np.asarray(Image.fromarray((grid * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
        out += layer * amp
        total += amp
        amp *= persistence
    return out / total


def draw_cracks(rng, size, count):
    """Branching random-walk cracks drawn as thin dark lines."""
    layer = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(layer)

    def crack(x, y, angle, length, width, depth):
        points = [(x, y)]
        for _ in range(length):
            # mostly straight with occasional sharp kinks, like real plaster cracks
            angle += rng.normal(0, 0.08) + (rng.normal(0, 0.7) if rng.random() < 0.12 else 0)
            step = rng.uniform(5, 11)
            x += math.cos(angle) * step
            y += math.sin(angle) * step
            points.append((x, y))
            if depth < 2 and rng.random() < 0.025:
                crack(x, y, angle + rng.choice([-1, 1]) * rng.uniform(0.6, 1.3), int(length * 0.45), max(1, width - 1), depth + 1)
        draw.line(points, fill=int(rng.uniform(70, 170)), width=width, joint='curve')

    for _ in range(count):
        crack(rng.uniform(0, size), rng.uniform(0, size), rng.uniform(0, 2 * math.pi), int(rng.uniform(15, 60)), int(rng.choice([1, 1, 1, 2])), 0)
    return np.asarray(layer.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?', default='frontend/public/textures/stone.webp')
    parser.add_argument('--seed', type=int, default=7)
    args = parser.parse_args()
    rng = np.random.default_rng(args.seed)

    clouds = fbm(rng, SIZE, octaves=6, base=2, persistence=0.5)                     # soft mottling
    grain = fbm(rng, SIZE, octaves=2, base=320, persistence=0.6)   # fine plaster grain
    blotch_mask = np.clip((fbm(rng, SIZE, octaves=4, base=5) - 0.58) * 6, 0, 1)
    blotches = blotch_mask * (0.6 + 0.4 * fbm(rng, SIZE, octaves=3, base=60))
    cracks = draw_cracks(rng, SIZE, count=40)

    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE
    vignette = np.clip(np.hypot(xx - 0.5, yy - 0.5) * 1.6, 0, 1) ** 2.2

    tex = clouds * 1.0 + grain * 0.12 - blotches * 0.3 - cracks * 1.15 - vignette * 0.45
    tex = (tex - tex.mean()) / tex.std() * TARGET_STD + TARGET_MEAN  # match measured tone
    Image.fromarray(np.clip(tex, 0, 255).astype(np.uint8), 'L').save(args.output, quality=72, method=6)
    print(f'wrote {args.output}: mean={tex.mean():.1f} std={tex.std():.1f}')


if __name__ == '__main__':
    main()
