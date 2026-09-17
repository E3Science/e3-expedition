# Image-generation briefs

These assets were created with the built-in image generator. Every source used a flat `#00ff00` chroma background; the background was removed locally and the original chroma source was retained beside the RGBA version.

All prompts required a strict 4x4 atlas, sixteen separated cells, no text, no labels, no characters, a fixed isometric camera, bottom-centered objects, saturated alien colors, readable silhouettes, and the established 64x32-diamond game style.

## Base biome atlas

Create sixteen seamless isometric ground tiles arranged as four rows of four variations: cyan fungal loam with luminous turquoise spores, blue-violet moss with magenta veins, coral mineral soil with orange-red crystalline growth, and indigo volcanic ground with electric-blue fissures. Keep the tile boundaries consistent so variants can be mixed without visible scale changes.

## Four biome construction atlases

Create one atlas per biome using this row contract:

1. mountain top, repeatable vertical mountain face, mountain base, mountain corner;
2. hill top, repeatable vertical hill face, hill base, hill corner;
3. four quadrants of one large 2x2 plant;
4. left edge, center, right edge, and corner of a dense spreading plant region.

The biome palettes and hero plants were cyan fungal with a giant mushroom, blue-violet moss with a giant fan tree, coral mineral with a giant coral tree, and indigo volcanic with a giant crystal-bark tree. Cliff faces were requested to continue cleanly into the tile above and below for arbitrarily tall stacks.

## Corrected flora atlases (v2)

The four corrected flora sources use the existing biome sheets as style references. The final shared prompt contract was:

> Create a strict 4 by 4 production source atlas for 64x64 isometric game sprites, matching the reference's painterly pixel-art style and 2:1 isometric viewpoint. Row 1 contains four connected cut pieces of one enormous alien organism, in order: only the wide left crown/branch, only the upper center crown, only the wide right crown/branch, and the one thick trunk/root base. The first three pieces connect into one broad crown above the single trunk; they must not be separate whole plants. Rows 2-4 contain twelve individual standalone flora props, one isolated plant or compact cluster per cell. Use exactly sixteen equal cells, one centered asset per cell, generous padding, and consistent scale. Use a perfectly flat solid `#00ff00` chroma background. No ground diamonds, square soil patches, grass carpet, terrain slabs, borders, grid lines, text, watermark, or shadows. Do not use `#00ff00` in the sprites.

Palette/organism substitutions:

- Cyan: saturated cyan/teal, dark blue shadows; enormous alien fungal tree.
- Violet: electric violet, cobalt blue, bioluminescent magenta, deep indigo shadows; enormous alien fan tree.
- Coral: coral orange, ember red, golden highlights, burgundy shadows; enormous branching coral tree.
- Indigo: deep indigo, ultraviolet purple, electric blue highlights, volcanic shadows; enormous crystal-bark tree.

## Water animation atlas

Create four animation families as rows, with four successive motion frames per family: open luminous water, straight shoreline, corner shoreline, and water surrounding a small mineral island. Preserve coastline and island silhouettes exactly while moving only ripple highlights, foam, and bioluminescent streaks.

## Habitat exterior atlas

Create four columns for command, laboratory, crew, and hydroponic-greenhouse modules. Use roof pieces in row one, matching upper walls in row two, matching entrances/bases in row three, and reusable corridor, airlock, power/data, and foundation connectors in row four. Each vertical set must assemble into a three-tile-high space-habitat module.

The corrected entrance source requested four full astronaut-scale entrance facades in row 1 (command, science laboratory, crew, and hydroponic greenhouse), with each doorway occupying roughly 70-80% of the visible facade height, plus twelve compatible tall entrance variants. It prohibited miniature hatches, complete multi-story stacks, ground diamonds, text, and shadows on a uniform `#00ff00` background. The build now stretches each full facade to a 64x96 composition and slices it into top, middle, and bottom 32-pixel strips, guaranteeing that the doorway spans the full three-level group.

## Habitat interior atlas

Create crew, laboratory, engineering, and hydroponic floors; matching bulkheads; airlocks, reinforced doors, observation windows, and a corridor junction; then sleeping, laboratory, hydroponic, and command furnishings.

## Hardware and cargo atlas

Create sealed supply crates, crate stacks, equipment cases, a strapped pallet, generator, atmosphere processor, water recycler, communications rack, oxygen cylinders, liquid tank, lockers, battery rack, work light, tool cart, hose/cable bundle, and an inactive maintenance robot.

## Biome-transition atlases

Create three strict 4x4 atlases covering cyan-violet and cyan-coral, cyan-indigo and violet-coral, then violet-indigo and coral-indigo. Each biome pair receives transitions toward N, NE, E, SE, S, SW, W, and NW. The second biome occupies the named edge or corner and blends organically into the first biome on the opposite side. Preserve the reference diamond geometry, scale, alien pixel-art texture, and upper-left lighting.
