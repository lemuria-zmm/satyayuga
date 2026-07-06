#!/usr/bin/env python3
"""白底立绘自动抠图（临时方案，2026-07-06）。

边缘连通抠白：只去掉与图像边缘相连的白区（背景），保留人物内部的白色（如白衣服），
再对切边做一圈羽化，减轻 AI 图软边缘留下的白晕。源图（美术/）不动，只改 public/char。

用法：python3 scripts/keyout-white.py [file1.png file2.png ...]
不带参数则处理 public/char 下所有 .png。
"""
import sys
import os
import glob
import numpy as np
from PIL import Image
from scipy import ndimage

WHITE_THRESH = 238   # 三通道都 >= 视为纯白背景候选
FRINGE_LO = 200      # 羽化：亮度 <=LO 完全不透明
FRINGE_HI = 238      # 亮度 >=HI 完全透明；之间线性
FEATHER_ITERS = 2    # 向人物内扩几像素做羽化环

DST_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'char')


def key_out(path: str) -> str:
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = (0.299 * r + 0.587 * g + 0.114 * b)

    white = (r >= WHITE_THRESH) & (g >= WHITE_THRESH) & (b >= WHITE_THRESH)

    # 连通标记，仅保留与边缘相连的白区 = 背景
    labels, n = ndimage.label(white)
    border = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border.discard(0)
    bg = np.isin(labels, list(border)) if border else np.zeros_like(white)

    alpha = np.full(white.shape, 255, dtype=np.float32)
    alpha[bg] = 0.0

    # 羽化：把 bg 向人物内扩 FEATHER_ITERS 像素，环上按亮度给部分透明，软化切边、削白晕
    dil = ndimage.binary_dilation(bg, iterations=FEATHER_ITERS)
    ring = dil & (~bg)
    frac = np.clip((FRINGE_HI - lum) / (FRINGE_HI - FRINGE_LO), 0.0, 1.0)  # 亮=0 暗=1
    alpha[ring] = np.minimum(alpha[ring], frac[ring] * 255.0)

    arr[:, :, 3] = alpha.astype(np.uint8)
    out = Image.fromarray(arr, 'RGBA')
    out.save(path)
    removed = int(bg.sum())
    total = white.size
    return f"{os.path.basename(path)}: 去背景 {removed*100//total}% 面积, 羽化环 {int(ring.sum())}px"


def main():
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(DST_DIR, '*.png')))
    if not files:
        print('无文件可处理')
        return
    for f in files:
        print(key_out(f))


if __name__ == '__main__':
    main()
