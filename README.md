# Stage3D

**Plan de scène 3D à l'échelle pour techniciens son et événementiel** · *Scale 3D stage plans for sound technicians*

👉 **[Use it now / Utiliser en ligne : paulmx.itch.io/stage3d](https://paulmx.itch.io/stage3d)** (free, in your browser · gratuit, dans le navigateur)

Made by **PaulMX** · réalisé avec l'IA (code et modèles 3D).

![Stage3D](itch-kit/screenshot-1-3d.png)

## Français

Stage3D permet de préparer scènes et événements avant d'arriver sur place : sonorisation, régie, backline, lumière, câbles, délais, liste de matériel et fiche PDF, le tout modélisé à l'échelle réelle en mètres.

- Consoles, enceintes, racks, praticables, tentes de régie, musiciens articulés, projecteurs avec faisceaux
- Calques, patch son et patch lumière DMX, mode changement de plateau
- Interface en français, English, Español, Deutsch, Italiano
- Sans installation ni connexion ; version Windows `Stage3D.exe` disponible dans les [Releases](../../releases)

### Compiler

Prérequis : [Node.js](https://nodejs.org).

```bash
cd dev
npm install
node build.mjs     # génère app.js à la racine
```

Ouvrir ensuite `index.html` dans Chrome, Edge ou Firefox. Tests : `dev/tests`.

## English

Stage3D is a free in-browser tool to prepare stages and events: PA, control, backline, lighting, cables, delays, kit list and PDF sheet, all modelled to real scale in metres. Available in EN/FR/ES/DE/IT. See [`README_EN.txt`](README_EN.txt) for details.

Build: `cd dev && npm install && node build.mjs`, then open `index.html`.

## Licence

[MIT](LICENSE) © PaulMX. 3D engine: [three.js](https://threejs.org) (MIT).
