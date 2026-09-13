# 自然根系静态稿 v2 · 图像生成记录

使用内置 image_gen 工具进行局部编辑。抽枝及枝叶阶段复用原图完整根系。

最终素材：
- soil-roots-v2.png：种子与立体自然根系。
- soil-seed-v2.png：种子与土壤，无根系。

两个生成文件为白底 PNG，未生成透明通道；页面通过 CSS multiply 与浅色背景融合，未对像素二次处理。

## 生根阶段初次编辑

Use case: precise-object-edit.
Asset type: transparent PNG growth-stage sprite for the existing 知树 web mockup.
Input image 1 is the edit target and the exact visual reference, a leafless 3D tree above a grassy mound showing roots.
Create the ROOTS-ONLY stage by removing ALL of the above-ground tree trunk and branches, replacing their former area with genuine transparent alpha. At the exact former trunk base put ONE small golden brown seed partly embedded in the earth and connected downwards to the roots. No green sprout, no stem, no tree leaves.
Preserve the original mound of irregular textured brown soil, natural pale tan woody roots, fine branching rootlets, lush low grass border, tiny white flowers and grey stones as faithfully as possible. The roots must look like the source: thick at the central origin, tapering into organically curving thin rootlets down across the front-facing soil section. Preserve original lighting, material, camera, root pattern and earthen shape, do not turn soil into a cylinder or flat geometric platform.
Very important composition invariant: keep the same square full-canvas framing as the source, with the mound in the BOTTOM THIRD of the canvas and the top approximately 65% of the image completely empty transparent space where the tree used to be. Do NOT enlarge or recenter the mound to fill the square. Keep the entire mound fully visible and original horizontal span, original bottom margin. Output an actual transparent PNG, no background, no checkerboard, no text, no UI, no watermark.
This will be layered exactly under the original tree image, so earth position and scale must match.

## 背景修正（最终根系素材）

Use case: precise-object-edit.
Edit the supplied image. Change ONLY the background: replace ALL of the visible grey/white checkerboard with a perfectly uniform solid PURE WHITE #FFFFFF background, including the empty top two-thirds of the square. This is a white-background production asset, NOT a transparency preview; DO NOT paint a checkerboard or other background pattern.
Keep the seed, soil mound, plant border, stones, ALL roots and rootlets, lighting, colors, scale and exact pixel composition unchanged. No tree trunk. No new objects. No text. Keep the same square framing and the mound in the bottom third.

## 土地与种子（最终种子素材）

Use case: precise-object-edit.
Asset type: seed-only first growth stage for an existing web mockup.
Input image is the edit target: a small golden seed on a soil mound with many exposed roots and low green plants.
Make TWO precise changes:
1. Remove ALL the exposed tree roots and every thin rootlet from the front-facing brown soil cross-section. Fill their positions with natural granular brown earth of the same texture and lighting. This is the seed stage BEFORE roots appear. Preserve the golden seed in its exact place at the top-center of the earth.
2. Replace ALL grey/white checkerboard background with uniform pure white #FFFFFF, including the large empty top area. This is a WHITE-background production sprite, NOT transparency. No checkerboard, no dark background.
Preserve the exact shape, scale, perspective and position of the soil mound, grassy low border, white flowers and grey stones. Keep the reference high quality soft 3D illustrated material. Keep the entire square framing with top 65% EMPTY WHITE and the mound in BOTTOM THIRD, not resized or recentered. No trunk, no branches, no sprout above the seed, no text, no labels, no UI.

