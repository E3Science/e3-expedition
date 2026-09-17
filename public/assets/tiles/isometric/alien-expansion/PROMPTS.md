# Alien expansion generation prompts

Mode: built-in image generation with the current `outside_master.png` as a
geometry/style reference. Both outputs were generated on a solid `#00ff00`
chroma-key background and converted locally to RGBA.

## Terrain sheet

```text
Use case: stylized-concept
Asset type: production game isometric terrain tilesheet expansion
Input image: outside_master.png is a geometry, camera-angle, scale, and painterly pixel-art reference only; create entirely new alien-world terrain art and do not copy its motifs.
Primary request: create exactly sixteen distinct alien terrain tiles arranged in a perfectly even 4-column by 4-row atlas. Row 1: deep turquoise fungal turf, blue-violet moss, warm coral mineral soil, dark indigo volcanic soil. Row 2: four edge-compatible transitions between turquoise turf and coral mineral soil. Row 3: open cyan water, shoreline edge, shoreline corner, tiny mineral island. Row 4: purple crystal cliff face, cyan-veined cliff face, glowing plateau top, low alien hill slope.
Style/medium: crisp hand-painted pixel art matching a polished 2:1 isometric role-playing game; readable at 64x64 pixels; vivid cyan, cobalt, violet, coral, amber, and bioluminescent accents.
Composition/framing: orthographic 2:1 isometric view; consistent diamond edges, scale, center, and upper-left lighting.
Constraints: exact 4x4 atlas; isolated cells; no text, borders, grid lines, overlap, logos, or watermark; perfectly uniform #00ff00 unused background; do not use #00ff00 inside the art.
```

## Props and resource sheet

```text
Use case: stylized-concept
Asset type: production game isometric alien flora, mineral, and resource-node tilesheet expansion
Input images: outside_master.png supplies geometry and scale; the generated alien terrain supplies palette and rendering style.
Primary request: create exactly sixteen distinct alien props in a perfectly even 4-column by 4-row atlas. Row 1: luminous cyan mushroom tree, cobalt fan-canopy tree, amber coral-like tree, twisted violet crystal-bark tree. Row 2: turquoise spiral fern, blue glow bulbs, coral cup fungi, violet ribbon grass. Row 3: cyan crystals, amber crystals, metallic meteor rock, luminous geode. Row 4: bubbling mineral spring, pod-bearing harvest plant, glowing spore nest, broad bioluminescent bush.
Style/medium: crisp hand-painted pixel art for a polished 2:1 isometric role-playing game, matching the alien terrain palette and readable at 64x64 pixels.
Composition/framing: every prop isolated, bottom-centered, fully visible, consistently scaled, and sitting on a subtle isometric ground footprint.
Constraints: exact 4x4 atlas; no text, borders, grid lines, overlap, logos, or watermark; perfectly uniform #00ff00 unused background; do not use #00ff00 inside the art.
```
