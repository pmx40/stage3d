# Stage3D

**Free, in-browser 3D stage planner for sound, lighting and event technicians.**
Place consoles, speakers, racks, backline, musicians and lights to real scale, draw your cables, check your delays, patch audio and DMX, plan a band changeover and export a PDF tech sheet.

👉 **[Use it now: paulmx.itch.io/stage3d](https://paulmx.itch.io/stage3d)** (runs in your browser, no account, no install)
💾 **[Windows .exe and zip: Releases](../../releases)**

*Made by **PaulMX**, a live and studio sound engineer · built with the help of AI (code and 3D models).*
*(Version française : voir [LISEZMOI.txt](LISEZMOI.txt) et la section [Français](#français) en bas de page.)*

![Stage3D 3D view](itch-kit/screenshot-1-3d.png)

---

## Why Stage3D?

Before a show you need to know what fits on the stage, where the cables go, how long they must be, which delay to set on the towers and what has to be carried in or out between two bands. Stage3D lets you answer all of this on a computer, with recognisable equipment modelled in metres, **before** you get on site.

- **Free, no account, no server.** Your plan stays in your browser and can be saved as a `.stage3d.json` file.
- **5 languages:** English, Français, Español, Deutsch, Italiano (detected automatically, switchable at any time, PDF and CSV exports follow the chosen language).
- **About 125 detailed 3D objects**, to real scale.
- **Your plans are safe:** plan files are versioned. Every plan saved with an earlier version still opens, and a plan from a newer version opens with a warning instead of being lost.

## Features

### 2D plan and 3D view
- Scale 2D plan plus 3D view (3D, Plan, Front, Side), grid, magnet and automatic dimensions.
- Adjustable room size, **11 floor types** (oak, walnut and herringbone parquet, black stage floor, polished concrete, tiles, carpet, grass, asphalt, cobblestones), dark or light floor.
- Smart placement: objects sit on stage decks, tables, flight cases, racks and speaker stands; dance mats lay over several decks.
- Move around like in a game: **WASD** (ZQSD on AZERTY) to walk, **E / Q** up / down, **Shift** to go fast, right-click + mouse to look around, mouse wheel to zoom towards the cursor (Ctrl or Alt + wheel for fine zoom), double-click to go somewhere.
- View buttons: eye level, view from the control position, view from the stage, overview, reset view (key `0`).
- Two looks: Dark (default) and Aero (Y2K / Frutiger Aero).

![2D plan and calculations](itch-kit/screenshot-2-plan-calculs.png)

### Equipment library (about 125 objects)
| Category | Examples |
|---|---|
| **Consoles** | Yamaha CL3 (0.84 × 0.67 m), Behringer X32, ChamSys QuickQ 20 (lighting), Rio3224-D2 stagebox, USB and rack audio interfaces |
| **Sound** | Line arrays, column PA, active 8" to 15" and passive speakers, tripod stands, mains on stands, 18" / 21" subs, front fills, monitors (wedge, active, coaxial), side-fills, delay towers |
| **Control** | Skirted tables, laptop, stools, control tents 3×3, 3×6 and 6×6 |
| **Racks and cases** | Wheeled flight cases, amp / RF / FX racks, 63 A distribution, reels, DI boxes (passive, active, stereo), power strips, cable ramps |
| **Stage** | Diamond-plate stage decks (adjustable heights), stairs, guardrails, Vauban barriers, pleated backdrop, black leg curtains, truss, truss tower, dance floor mats |
| **Backline and musicians** | Drum kit, guitar and bass amps, guitars on stands, pedalboard, MIDI and 88-key keyboards, grand pianos (baby grand, 2 m, concert) with bench, DJ set, dynamic and condenser mics on realistic stands, **articulated musicians** (singer, guitarist, bass player, drummer, keyboardist) |
| **Lighting and video** | PC 750 W, PAR 64, 1 kW profile, LED PC (Fresnel), LED PAR, moving heads, LED bar, light stands (alone, T-bar, with 2 or 4 PARs), DMX splitters, string lights, smoke machine, LED screen |

The models respect the dimensions and general layout of the real equipment (no brand logos).

| | |
|---|---|
| ![Object panel](itch-kit/screenshot-3-objet.png) | ![Equipment list](itch-kit/screenshot-4-liste.png) |
| ![Musicians and backline](itch-kit/screenshot-12-musiciens-backline.png) | ![Mics and pedalboard](itch-kit/screenshot-14-micros-pedalboard.png) |
| ![Grand piano, parquet, mics and light](itch-kit/screenshot-16-piano-parquet-micros-lumiere.png) | ![DJ set](itch-kit/screenshot-10-dj-set.png) |

### Lighting
- **Lights on stands or on the floor:** PAR, PC, LED PC, profile spots and moving heads can be hung, put on a telescopic stand or placed on the floor. Pick the mounting while placing (Auto hangs the light if a truss is nearby, otherwise it goes on the floor).
- **Realistic beams:** gradient cone, soft floor spot with a hot centre (sharp for a profile, soft for a PC) and a glow at the source.
- Tilt, aim at a point, adjustable angle and intensity per light; intensity and size sliders for all beams at once; **filter beams by light type**.
- **DMX lighting patch:** universe, address and mode for every light, automatic addressing that never splits a light between two universes, a gauge per universe, address conflicts highlighted in red, CSV export.

| | |
|---|---|
| ![Lights on stands with beams](itch-kit/screenshot-20-lumieres-sur-pied-faisceaux.png) | ![Stage lights and beams](itch-kit/screenshot-13-projecteurs-faisceaux.png) |
| ![Beam filter](itch-kit/screenshot-19-filtre-faisceaux.png) | ![DMX lighting patch](itch-kit/screenshot-23-patch-lumiere.png) |

### Audio patch and monitors
- Clean input list: channel, source, mic / DI, stand and a 48 V box. Press Enter to jump to the next channel, drag a number to reorder, full-screen editor for notes.
- **Numbered stage monitors:** a numbered badge on each wedge or side-fill, automatic numbering and a table on the PDF sheet.

| | |
|---|---|
| ![Audio patch](itch-kit/screenshot-21-patch-son.png) | ![Numbered monitors](itch-kit/screenshot-17-retours-numerotes-tapis-sol.png) |

### Layers and stage changeover
- **Layers:** every object belongs to a group (stage, sound, backline, mics, musicians, lighting, furniture, annotations) or to layers you create. Show or hide a whole group in one click, isolate it or lock it. A **No backline** button removes musicians and backline instantly.
- **Changeover mode:** chain two line-ups on the same stage. What stays stays in place, what leaves is greyed out with a **TAKE OUT** tag, what arrives is tagged **BRING IN**. You get take-out / bring-in / stays lists, a CSV export and a dedicated PDF page.

| | |
|---|---|
| ![Layers, no backline](itch-kit/screenshot-18-calques-sans-backline.png) | ![Changeover mode](itch-kit/screenshot-22-changement-de-plateau.png) |

### Calculations, cables and exports
- **Cables and measures:** length needed (margin and slack included) and standard length to order.
- **Sound calculations:** arrival times, alignment delays, delay tower settings (Haas effect), speaker coverage.
- **Exports:** equipment and cable list (CSV), audio and lighting patch (CSV), **PDF tech sheet** (scale plan, 3D view, equipment, cables, delays, audio and lighting patch, changeover).
- **Ready-made templates:** 5-piece band concert, conference, DJ set, 6×4 stage.

| | |
|---|---|
| ![PDF tech sheet](itch-kit/screenshot-5-fiche.png) | ![Control tent with CL3](itch-kit/screenshot-6-regie-tente-cl3.png) |
| ![Front fills and coverage](itch-kit/screenshot-7-front-fills-couverture.png) | ![Stacking cases and tables](itch-kit/screenshot-8-empilement-cases-tables.png) |
| ![Conference template](itch-kit/screenshot-9-conference.png) | ![Aero style](itch-kit/screenshot-11-style-aero.png) |

![Interface in German](itch-kit/screenshot-15-interface-deutsch.png)

## Run it

| Option | How |
|---|---|
| **Online** | Open [paulmx.itch.io/stage3d](https://paulmx.itch.io/stage3d) |
| **Windows .exe** | Download `Stage3D.exe` from the [Releases](../../releases) and double-click (opens the app in Edge or Chrome, nothing to install) |
| **Offline in a browser** | Download `stage3d-itch.zip` from the Releases, unzip and open `index.html` |

A computer with a mouse is recommended.

## Build from source

Requirements: [Node.js](https://nodejs.org).

```bash
cd dev
npm install
node build.mjs      # bundles dev/src into app.js at the repository root
```

Then open `index.html` in Chrome, Edge or Firefox. Sources are in `dev/src` (three.js, plain JavaScript modules, bundled with esbuild). The plan-compatibility test is in `dev/tests` (see `dev/tests/LISEZMOI.txt`).

## Good to know

Delay calculations are free-field estimates, to be confirmed by an on-site measurement. DMX addresses are for planning: check them against your fixtures' manuals. Light beams and speaker coverage are visual aids. The tool does not calculate weight or structural loads.

## Français

Stage3D est un outil gratuit, dans le navigateur, pour préparer scènes et événements à l'échelle réelle : sonorisation, régie, backline, lumière, câbles, délais, patch son et lumière DMX, changement de plateau et fiche PDF. Disponible en français, English, Español, Deutsch et Italiano. Voir [`LISEZMOI.txt`](LISEZMOI.txt) pour les détails.

## License and credits

[MIT](LICENSE) © PaulMX. 3D engine: [three.js](https://threejs.org) (MIT). Made by PaulMX · réalisé avec l'IA.
