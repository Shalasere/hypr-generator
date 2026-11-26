# hypr-generator

Design the Hyprland pieces you look at every day in a browser, then copy the config.
No build step, no server: open `index.html`.

| Tab | Writes | What you can do |
|---|---|---|
| **hyprlock** | `~/.config/hypr/hyprlock.conf` | Start from a preset (tuigreet console login, ly box, stock), tweak it, or edit widgets one by one. Preview at your monitor's real resolution, simulate typing, a wrong password and Caps Lock. |
| **hypridle** | `~/.config/hypr/hypridle.conf` | Edit listeners and see them on an idle timeline, split by AC power and battery. |
| **Hyprland** | a `hl.config({ … })` block for `hyprland.lua` | Gaps, borders (with gradients), rounding, opacity, shadow and blur on a sample tiled desktop. |

Pick a common monitor size or **Custom…** to enter any width × height in physical
pixels. The Hyprland tab writes the Lua config format (`hyprland.lua`, Hyprland 0.57+).

## How the hyprlock preview stays honest

hyprlock places each widget from an anchor (`halign`/`valign`) plus an offset in monitor
pixels, with y growing upward. The preview uses the same rule at your monitor's full
resolution and only scales the result to fit, so moving to a 5120×1440 ultrawide does
not shift anything. Use **1:1** to inspect real pixels around the centre.

The tuigreet preset draws the box as one label and puts the password field right after
`Password:`. That position depends on the font's character width and line height. The
app measures the web fonts it uses for the preview; if the field lands slightly off on
the real lock screen, nudge **Calibration** and copy the config again.

Text in `label` widgets is Pango markup. `#` starts a comment in hyprlock's config
format, so the output writes colors inside markup as `##rrggbb`.

## Fonts

The preview is only as exact as the font it draws with, so it uses real font files:

- **Built-in fonts** (Inconsolata, Terminess, JetBrainsMono, FiraCode and Blex Nerd Fonts)
  load the official Nerd Font file from jsDelivr the first time they're used, the same
  files the Arch `ttf-*-nerd` packages install. Offline, a look-alike web font stands in.
- **Upload** any `.ttf`, `.otf`, `.woff`, `.woff2`, or a `.zip` containing one. On Linux,
  installed fonts are in `/usr/share/fonts`.
- **Link** to a font file or zip. GitHub `blob` links are rewritten to jsDelivr, which
  allows pages to download files. Sites that don't allow it get a message to download
  and upload instead.

The family name written into `hyprlock.conf` is read from the font file itself, and the
character width and line height are measured from it. Added fonts are kept in the
browser (IndexedDB).

hyprlock starts drawing password text about one character cell left of the input
field's edge (seen on hyprlock 0.9.7). **Calibration → Password text starts this many
columns left of its field** models that, so the `*` land right after `Password:`.

## Project files

**Save project** downloads your settings as JSON and **Open project** loads them back.
Settings are also kept in your browser between visits.

## Layout

```
index.html
css/app.css
js/util.js       colors, Pango markup, fake cmd[] output for the preview
js/fonts.js      font list and metric measurement
js/ui.js         form controls bound to state
js/hyprlock.js   presets, preview, hyprlock.conf output
js/hypridle.js   listeners, timeline, hypridle.conf output
js/hyprland.js   look controls, desktop preview, Lua output
js/app.js        tabs, monitor, scaling, output panel, save/load
```
