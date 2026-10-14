STAGE3D: scale stage plans for sound & event technicians (browser or executable)
=============================================================================
(Version française : LISEZMOI.txt)

CREDITS
  Stage3D created by PaulMX: https://paulmx.itch.io
  Built with the help of artificial intelligence (AI): code and 3D models.
  3D engine: three.js (c) 2010-2024 the three.js authors, MIT licence (https://threejs.org).

LANGUAGES
  English, Français, Español, Deutsch, Italiano. The browser language is detected on first launch; use the language menu
  (top right) to change it. Your choice is remembered. The PDF sheet and CSV exports follow the selected language.

RUNNING IT
  - Stage3D.exe (Windows): double-click. It opens the app in its own window (it uses Microsoft Edge or Google Chrome, already
    installed on Windows). Your plan is kept between launches.
  - Or open index.html in Chrome, Edge or Firefox. No installation, no internet connection needed.
  App files: index.html, style.css, app.js (three.js is already bundled in app.js).

MOVING AROUND IN 3D (keyboard + mouse)
  W A S D   forward / left / back / right (AZERTY keyboards: Z Q S D, same physical keys)
  E / Q     up / down (AZERTY: E / A)           Shift = fast      Alt = slow
  Right mouse button + mouse   look around (the camera turns on the spot, like in a game)
  Left button on empty space + mouse   orbit around the scene       Middle button / Shift + drag   pan the view
  Mouse wheel   smooth zoom towards the cursor · Ctrl or Alt + wheel = FINE zoom · + / - keys (Shift = fine step)
  Zoom slider (top bar)   precise zoom, from 12 cm (close-up of a microphone) to 170 m; in Plan view the readout is the scale (1:xx)
  Double-click   go to the spot        F   frame the selection or everything (a selection is framed close up)
  Key 0 or Home, or the ⟲ button   RESET THE VIEW (default angle, whole plan framed) if you get lost in the scene
  Buttons at the bottom right of the view: 👁 eye level (1.70 m) · 🎧 view from the listening point / control position ·
  🎤 view from the edge of the stage (the singer's point of view) · ⤢ overview · ⟲ reset the view.

QUICK START
  - Library (left): click an object, then click on the plan to place it. Esc or right-click to stop.
  - Everything is at real scale in metres (Yamaha CL3: 0.84 × 0.67 m, Rio3224: 0.48 × 0.37 m, stage deck 2×1, Vauban barrier 2.50 m...).
  - Objects automatically sit ON stage decks, risers, tables, flight cases, racks and speaker stands (height calculated):
    console on a table on a stage deck, amp or laptop on a case, etc. Moving a support moves what sits on it.
  - Room size and FLOOR TYPE: "📐 Room" button (width, depth, distance to the back wall, presets from 10×12 m to 70×80 m, "Fit to my plan").
    The same screen offers 11 real-scale floors: standard (neutral), light oak parquet, dark parquet (walnut), herringbone parquet, black
    stage floor, polished concrete, tiles, blue-grey carpet, grass, asphalt, cobblestones. The floor is saved with the plan; on the PDF
    sheet and the PNG it is lightened to save ink.
  - Library: every category is collapsed at start-up (click a category to open it; searching opens them automatically).
  - LAYERS ("Layers" tab): every object belongs to a group (layer). By default the group of its type: Stage, Sound, Consoles, Racks & cables,
    Backline, Mics & stands, Musicians, Lighting, Audience & furniture, Annotations; you can create your own layers ("New layer", "Create with the
    selection") and move objects between layers (the "Layer" field of the Object panel, or a layer's ⇥ button). On each row: the eye shows / hides
    the whole group IN ONE CLICK, ◎ isolates the layer (click again = show everything), 🔒 locks it (visible but not selectable), the name selects the
    whole group. Cables and measures have their own layer. A hidden layer disappears everywhere (3D, plan, PNG / PDF exports, beams, magnet); the
    toolbar shows how many layers are hidden. "🚫 No backline" (toolbar) removes the musicians AND the backline in one click; click again to restore.
    By default the equipment list and the PDF sheet only count visible layers (untick the box in the Layers tab).
  - BEAM FILTER by light type: ▾ button next to "Beams" (or the Layers tab): tick LED PAR, PC 750 W, LED PC, PAR 64, profile, moving head, LED bar;
    "All" / "None". A selected light always shows its beam.
  - Hidden / locked layers and the beam filter are display preferences (kept in the browser, not in the plan).
  - LIGHTS ON STANDS OR ON THE FLOOR: when placing a light (PAR, PC, LED PC, profile, moving head) the "Mounting" bar offers Auto (hung if a truss is
    within reach, otherwise on the floor), Truss, On stand, On the floor. The Object panel > "Mounting" changes it afterwards (telescopic stand, adjustable
    total height). Beams follow the real position of the lamp.
  - AUDIO PATCH: plain input list (no., source, mic / DI, stand, 48 V box; Enter = next channel, drag the number to reorder, full-screen editor
    with notes and ▲ ▼ ⧉). LIGHTING PATCH: Patch tab > "Lighting patch": universe, address and DMX mode of every light in the
    plan, automatic addressing (stage right → left, back → front or by type, never splitting a light between two universes), universe gauges, address
    conflicts in red. Both patches are on the PDF sheet (Patch page) and export to CSV.
  - STAGE CHANGEOVER ("⇄ Changeover" button, Line-ups tab): two line-ups follow each other. Pick the current and the next one, select objects then
    "Stays in place" / "Leaves (take out)" / "Arrives (bring in)". What stays stays in place; what leaves is GREYED OUT with a "TAKE OUT" tag; what arrives
    is marked in green "BRING IN". Take-out / bring-in / stays lists, CSV, and a dedicated page on the PDF sheet.
  - BEAM INTENSITY AND SIZE: Layers tab (or Lighting patch): "Intensity" and "Size" sliders for all beams; per-light intensity in the Object panel
    (Orientation) and the "Int. %" column of the lighting patch; the individual beam angle is in Orientation too.
  - REALISTIC BEAMS: gradient cone, floor spot with hot centre and penumbra (sharp for a profile, soft for a PC), source glow, lights that add up;
    on light backgrounds (exports) they stay readable.
  - PLAN COMPATIBILITY: the .stage3d.json file carries a version number ("v" field, currently 4). Plans from earlier versions always open, losing
    nothing (both files saved with "Save" and the browser's automatic save). A plan created by a newer version also opens, with a warning, and its
    unknown data is kept.
  - NUMBERED stage monitors: select a monitor (wedge, active, coaxial, side-fill) > "Monitor no. (mix)": a numbered yellow badge appears on
    it (3D, plan, PNG, PDF sheet). "Number all monitors" numbers them 1 to n, from stage right (screen left) to stage left (screen right). The PDF sheet adds a table of
    the numbered monitors.
  - Dance floor mats: they sit on the floor or on stage decks (even decks smaller than the mat); size and colour are adjustable.
  - Style: "Dark mode" / "Aero" button in the top bar (Aero = Y2K / Frutiger Aero, light). Exports are always light for printing.
  - Names (labels) are hidden at start: "Names" button. They always appear on the PDF sheet and the PNG.
  - Magnet: snaps stage deck edges together. Grid: rounds positions (step adjustable).
  - Views: 1 = 3D, 2 = Plan, 3 = Front, 4 = Side. In Plan view, drag on empty space to box-select.
  - Measure (M): distance between two points. Cable (C): draw a route; the length needed (margin + slack) and the next standard
    length are calculated.
  - Calculations: place a "Listening point" and speakers -> distances, arrival times, alignment delays.
    Delay towers: delay = distance main -> delay / speed of sound + Haas.
  - List: equipment and cables counted automatically (CSV export). Patch: input list (CSV export).
  - PDF sheet: scale plan (1:xx), 3D view, equipment, cables, delays, patch. In the print window choose "Save as PDF",
    A4 portrait, scale 100 %.
  - The plan is saved automatically in the browser. "Save" creates a .stage3d.json file (reopen with "Open" or by dropping it on the window).

LIBRARY (about 125 objects)
  Stage & structure: stage decks 1×1 / 2×1 / 2×2 (diamond plate, adjustable heights), riser, STAGE STAIRS (with or without handrails,
    adjustable height), guardrail, Vauban barrier, pleated backdrop, BLACK LEG CURTAINS (on stands or hung), truss 1/2/3 m, truss tower, DANCE FLOOR MATS (Marley type: 1.6 m roll or 6×4 m area; black, grey, white, blue, red, green).
  Sound: line arrays (flown / ground), column PA, ACTIVE speakers 8" / 10" / 12" / 15", passive 12" / 15", tripod stand, mains on stands,
    subs 18" / 21", FRONT FILLS, monitors (wedge, active 12", coaxial 15"), side-fills, delay towers. Monitors can be NUMBERED.
  Consoles & control: Yamaha CL3, Behringer X32, ChamSys QuickQ 20, Yamaha Rio3224-D2 stagebox, AUDIO INTERFACES (USB 2-in, rack 8-in),
    complete control positions, tables, laptop, stools, control TENTS 3×3 / 3×6 / 6×6.
  Racks, cases & cables: amp / RF / FX racks, flight cases, 63 A distribution, reels, DI BOXES (passive, active, stereo),
    POWER STRIPS (6 and 4 sockets), cable ramps (5 and 2 channels).
  Backline & musicians: drum kit (hoops, lugs, hi-hat with pedal, kick pedal), throne, guitar amps (combo, 4×12 stack) and bass amp,
    GUITARS ON STANDS (Strat-style, LP-style, bass, acoustic, empty stand), PEDALBOARD, MIDI KEYBOARDS (25 and 49 keys),
    88-key keyboard on stand, GRAND PIANO (baby grand 1.65 m, 2 m, concert 2.75 m; lid fully open, short stick or closed), PIANO BENCH
    (straight legs or screw-adjustable), DJ set, CONDENSER MICS on boom or straight stands, OVERHEAD, STEREO PAIR on a bar (AB, XY, ORTF),
    realistic MIC STANDS (tripod or round base, telescopic tubes, clutch, XLR cable; vocal /
    instrument / condenser / overhead mic of your choice), SHORT BOOM STAND + MIC for miking amps (place it in front of the amp),
    articulated MUSICIANS (standing, singer with mic, guitarist, bass player, seated drummer, keyboardist; hair and skin to choose).
  Lighting & video: PC 750 W, PAR 64 and 1 kW profile spot (tungsten), LED PC (Fresnel), LED PAR, moving head, LED bar, STRING LIGHTS
    (festoon), smoke machine, T-bar light stand + 2 PARs, LIGHT STAND (stand only, T-bar, T-bar + 2 or 4 LED PARs), DMX SPLITTERS
    (1→8 1U rack, 1→4 box), LED screen 3×2.
  Audience & furniture, annotations (zone, text, listening point).

AIMING LIGHTS (and other objects)
  - Horizontal pan: the object's rotation (Object panel, or R / T keys).
  - Tilt: Object panel > "Orientation (tilt)": slider from -90° to +90°, 0° = horizontal, 90° = straight down at the floor.
    Available for lights (PC, LED PC, PAR, profiles, LED PAR, moving heads, LED bars, T-bar stand), speakers (flown line array, active,
    passive), the LED screen and the smoke machine.
  - "🎯 Aim at a point": then click the point to light (floor, stage, person): pan and tilt are calculated. Works with several
    lights selected at once.
  - "Beams" button (key B): shows the light cone and the spot on the floor (on top of the stage deck if aimed there); the beam angle
    is adjustable. Beams of selected lights are always shown.

SHORTCUTS
  V/M/C tools · 1/2/3/4 views · R / Shift+R rotate 15° · T / Shift+T rotate 90° · Del delete · Ctrl+D duplicate · Ctrl+C/V copy-paste
  Ctrl+Z/Y undo-redo · G grid · L names · H speaker coverage · B beams · 0 reset the view · + / - zoom
  Ctrl+S save · Ctrl+O open · Ctrl+P PDF sheet

MODIFYING THE CODE (optional)
  Plan format: STATE_VERSION and MIGRATIONS in dev/src/store.js. Compatibility test: dev/tests (see dev/tests/LISEZMOI.txt).
  Sources are in dev/src: catalog.js (object list), models_*.js (3D models), textures.js, floors.js (floor types), models_piano.js, gfx.js, store.js (data and calculations),
  view.js (3D, navigation), ui.js (interface), sheet.js (PDF sheet), templates.js (scene templates), i18n.js + lang_ui.js +
  lang_catalog.js (translations: French source text -> EN / ES / DE / IT).
  To rebuild app.js:   cd dev   then   npm install   then   node build.mjs
  To add an object: write a drawing function in models_*.js, add a def0(...) line to DEFS (catalog.js), and its translation in lang_catalog.js.
  To rebuild the executable: see dev/launcher/Launcher.cs (compiled with csc.exe from the .NET Framework, resources index.html, style.css, app.js).

KNOWN LIMITS
  - Models are faithful to the dimensions and general layout of the equipment (no brand logos), not millimetre-exact copies.
  - Delay calculations use the approximate acoustic centre of the speaker (55 % of its height) and free-field propagation:
    confirm with a measurement (Smaart) on site.
  - No weight or floor-load data is calculated: this does not replace a structural calculation.
  - Speaker coverage is an indicative horizontal sector, not a simulation. Light beams are a visual aid, not a photometric simulation.
