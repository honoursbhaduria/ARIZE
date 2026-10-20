"""Cracked-stone metal textures (gold, teal) used to fill the logo and accent text.

Uses the same noise as generate_texture.py, but with bolder, denser cracks
and stronger mottling so the pattern stays visible inside small letters,
then maps it onto a gold palette with a metallic shine.

Usage: python scripts/generate_logo_texture.py [--seed N]
"""
import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from generate_texture import fbm  # noqa: E402

SIZE = 512

# Colour ramps (position, r, g, b): dark edge -> body -> highlight
PALETTES = {
    'gold': [  # logo, hero accent
        [0.00, 58, 34, 8],
        [0.30, 150, 98, 14],
        [0.55, 226, 170, 20],
        [0.80, 250, 208, 100],
        [1.00, 255, 244, 205],
    ],
    'teal': [  # matches the divider gem
        [0.00, 8, 34, 52],
        [0.30, 22, 96, 132],
        [0.55, 44, 168, 196],
        [0.80, 120, 222, 228],
        [1.00, 222, 250, 250],
    ],
}


def color_map(t, stops):
    stops = np.array(stops, np.float32)
    out = np.zeros(t.shape + (3,), np.float32)
    for channel in range(3):
        out[..., channel] = np.interp(t, stops[:, 0], stops[:, channel + 1])
    return out


def bold_cracks(rng, size, count):
    layer = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(layer)

    def crack(x, y, angle, length, width, depth):
        points = [(x, y)]
        for _ in range(length):
            angle += rng.normal(0, 0.1) + (rng.normal(0, 0.8) if rng.random() < 0.15 else 0)
            x += math.cos(angle) * rng.uniform(4, 8)
            y += math.sin(angle) * rng.uniform(4, 8)
            points.append((x, y))
            if depth < 2 and rng.random() < 0.06:
                crack(x, y, angle + rng.choice([-1, 1]) * rng.uniform(0.7, 1.3), length // 2, max(1, width - 1), depth + 1)
        draw.line(points, fill=255, width=width, joint='curve')

    for _ in range(count):
        crack(rng.uniform(0, size), rng.uniform(0, size), rng.uniform(0, 2 * math.pi), int(rng.uniform(12, 30)), int(rng.choice([2, 3, 3])), 0)
    return np.asarray(layer.filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', type=int, default=5)
    args = parser.parse_args()
    rng = np.random.default_rng(args.seed)

    mottle = fbm(rng, SIZE, octaves=5, base=3, persistence=0.55)
    pits = fbm(rng, SIZE, octaves=2, base=90, persistence=0.6)
    cracks = bold_cracks(rng, SIZE, count=26)

    t = (mottle - mottle.mean()) * 1.5 + 0.7 + (pits - 0.5) * 0.18 - cracks * 0.5
    shine = 1 - (np.abs(np.linspace(-1, 1, SIZE))[:, None] ** 2) * 0.3
    for name, stops in PALETTES.items():
        out = f'frontend/public/textures/logo-{name}.webp'
        rgb = color_map(np.clip(t * shine, 0, 1), stops)
        Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').save(out, quality=90, method=6)
        print(f'wrote {out}')


if __name__ == '__main__':
    main()
