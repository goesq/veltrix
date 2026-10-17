# Veltrix motion

Marketing videos, drawn in SVG and rendered frame by frame. Not part of the app.

## Usage

```bash
npm install
npm run render                                   # launch video, every format, English
npm run render -- --language pt                  # Portuguese copy
npm run render -- --format vertical              # vertical | horizontal | square
npm run render -- --frames 1.6,13.6              # only those instants, as PNG, for review
npm run render -- --fps 30
```

Videos land in `output/` (ignored by git; render again to get them back). Rendering uses the
Chrome or Edge installed on the machine (or the executable in `CHROME_PATH`) and the ffmpeg
from the `ffmpeg-static` package.

To work on a scene, open `index.html` in a browser: it loops with a scrubber and switches
format and language (`?format=horizontal&language=pt`).

## Structure

- `lib/time.js`: easings (the app's own curves), `range`, `lerp`, seeded random.
- `lib/brand.js`: the palette and the logotype geometry, identical to
  `src/renderer/src/components/brand/geometry.ts`. Scenes draw the logo from here.
- `lib/svg.js`: SVG markup helpers and text measurement.
- `lib/ui.js`: pieces of the interface for video (terminal pane, note with a checklist, agent
  chip) and the headline that enters word by word (`*word*` in the accent color).
- `scenes/<name>.js`: registers `window.Scenes['<name>'] = { duration, draw }`. `draw(t, stage)`
  returns the frame's SVG and must be a **pure function of time**: no `Date.now()`, no state
  carried between frames, no unseeded randomness. That is what makes frame-by-frame export
  possible.
- `fonts/`: Inter and JetBrains Mono (SIL Open Font License), so renders need no network.

## Scenes

- `launch` (21 s): six messy terminals fall into Veltrix's grid; a goal assembles a team and
  its tasks tick off; two agents message each other on the canvas and tick a shared checklist;
  the two agents become the logo's nodes.
